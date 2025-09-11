const claudeAccountService = require('./claudeAccountService')
const claudeConsoleAccountService = require('./claudeConsoleAccountService')
const bedrockAccountService = require('./bedrockAccountService')
const ccrAccountService = require('./ccrAccountService')
const accountGroupService = require('./accountGroupService')
const redis = require('../models/redis')
const logger = require('../utils/logger')
const { parseVendorPrefixedModel } = require('../utils/modelHelper')

class UnifiedClaudeScheduler {
  constructor() {
    this.SESSION_MAPPING_PREFIX = 'unified_claude_session_mapping:'
  }

  // 🔧 辅助方法：检查账户是否可调度（兼容字符串和布尔值）
  _isSchedulable(schedulable) {
    // 如果是 undefined 或 null，默认为可调度
    if (schedulable === undefined || schedulable === null) {
      return true
    }
    // 明确设置为 false（布尔值）或 'false'（字符串）时不可调度
    return schedulable !== false && schedulable !== 'false'
  }

  // 🔍 检查账户是否支持请求的模型
  _isModelSupportedByAccount(account, accountType, requestedModel, context = '') {
    if (!requestedModel) {
      return true // 没有指定模型时，默认支持
    }

    // Claude OAuth 账户的 Opus 模型检查
    if (accountType === 'claude-official') {
      if (requestedModel.toLowerCase().includes('opus')) {
        if (account.subscriptionInfo) {
          try {
            const info =
              typeof account.subscriptionInfo === 'string'
                ? JSON.parse(account.subscriptionInfo)
                : account.subscriptionInfo

            // Pro 和 Free 账号不支持 Opus
            if (info.hasClaudePro === true && info.hasClaudeMax !== true) {
              logger.info(
                `🚫 Claude account ${account.name} (Pro) does not support Opus model${context ? ` ${context}` : ''}`
              )
              return false
            }
            if (info.accountType === 'claude_pro' || info.accountType === 'claude_free') {
              logger.info(
                `🚫 Claude account ${account.name} (${info.accountType}) does not support Opus model${context ? ` ${context}` : ''}`
              )
              return false
            }
          } catch (e) {
            // 解析失败，假设为旧数据，默认支持（兼容旧数据为 Max）
            logger.debug(
              `Account ${account.name} has invalid subscriptionInfo${context ? ` ${context}` : ''}, assuming Max`
            )
          }
        }
        // 没有订阅信息的账号，默认当作支持（兼容旧数据）
      }
    }

    // Claude Console 账户的模型支持检查
    if (accountType === 'claude-console' && account.supportedModels) {
      // 兼容旧格式（数组）和新格式（对象）
      if (Array.isArray(account.supportedModels)) {
        // 旧格式：数组
        if (
          account.supportedModels.length > 0 &&
          !account.supportedModels.includes(requestedModel)
        ) {
          logger.info(
            `🚫 Claude Console account ${account.name} does not support model ${requestedModel}${context ? ` ${context}` : ''}`
          )
          return false
        }
      } else if (typeof account.supportedModels === 'object') {
        // 新格式：映射表
        if (
          Object.keys(account.supportedModels).length > 0 &&
          !claudeConsoleAccountService.isModelSupported(account.supportedModels, requestedModel)
        ) {
          logger.info(
            `🚫 Claude Console account ${account.name} does not support model ${requestedModel}${context ? ` ${context}` : ''}`
          )
          return false
        }
      }
    }

    // CCR 账户的模型支持检查
    if (accountType === 'ccr' && account.supportedModels) {
      // 兼容旧格式（数组）和新格式（对象）
      if (Array.isArray(account.supportedModels)) {
        // 旧格式：数组
        if (
          account.supportedModels.length > 0 &&
          !account.supportedModels.includes(requestedModel)
        ) {
          logger.info(
            `🚫 CCR account ${account.name} does not support model ${requestedModel}${context ? ` ${context}` : ''}`
          )
          return false
        }
      } else if (typeof account.supportedModels === 'object') {
        // 新格式：映射表
        if (
          Object.keys(account.supportedModels).length > 0 &&
          !ccrAccountService.isModelSupported(account.supportedModels, requestedModel)
        ) {
          logger.info(
            `🚫 CCR account ${account.name} does not support model ${requestedModel}${context ? ` ${context}` : ''}`
          )
          return false
        }
      }
    }

    return true
  }

  // 🎯 统一调度Claude账号（官方和Console）
  async selectAccountForApiKey(apiKeyData, sessionHash = null, requestedModel = null) {
    try {
      // 解析供应商前缀
      const { vendor, baseModel } = parseVendorPrefixedModel(requestedModel)
      const effectiveModel = vendor === 'ccr' ? baseModel : requestedModel

      logger.debug(
        `🔍 Model parsing - Original: ${requestedModel}, Vendor: ${vendor}, Effective: ${effectiveModel}`
      )

      // 如果是 CCR 前缀，只在 CCR 账户池中选择
      if (vendor === 'ccr') {
        logger.info(`🎯 CCR vendor prefix detected, routing to CCR accounts only`)
        return await this._selectCcrAccount(apiKeyData, sessionHash, effectiveModel)
      }
      // 如果API Key绑定了专属账户或分组，优先使用
      if (apiKeyData.claudeAccountId) {
        // 检查是否是分组
        if (apiKeyData.claudeAccountId.startsWith('group:')) {
          const groupId = apiKeyData.claudeAccountId.replace('group:', '')
          logger.info(
            `🎯 API key ${apiKeyData.name} is bound to group ${groupId}, selecting from group`
          )
          return await this.selectAccountFromGroup(
            groupId,
            sessionHash,
            effectiveModel,
            vendor === 'ccr'
          )
        }

        // 普通专属账户
        const boundAccount = await redis.getClaudeAccount(apiKeyData.claudeAccountId)
        if (
          boundAccount &&
          boundAccount.isActive === 'true' &&
          boundAccount.status !== 'error' &&
          this._isSchedulable(boundAccount.schedulable)
        ) {
          logger.info(
            `🎯 Using bound dedicated Claude OAuth account: ${boundAccount.name} (${apiKeyData.claudeAccountId}) for API key ${apiKeyData.name}`
          )
          return {
            accountId: apiKeyData.claudeAccountId,
            accountType: 'claude-official'
          }
        } else {
          logger.warn(
            `⚠️ Bound Claude OAuth account ${apiKeyData.claudeAccountId} is not available (isActive: ${boundAccount?.isActive}, status: ${boundAccount?.status}, schedulable: ${boundAccount?.schedulable}), falling back to pool`
          )
        }
      }

      // 2. 检查Claude Console账户绑定
      if (apiKeyData.claudeConsoleAccountId) {
        const boundConsoleAccount = await claudeConsoleAccountService.getAccount(
          apiKeyData.claudeConsoleAccountId
        )
        if (
          boundConsoleAccount &&
          boundConsoleAccount.isActive === true &&
          boundConsoleAccount.status === 'active' &&
          this._isSchedulable(boundConsoleAccount.schedulable)
        ) {
          logger.info(
            `🎯 Using bound dedicated Claude Console account: ${boundConsoleAccount.name} (${apiKeyData.claudeConsoleAccountId}) for API key ${apiKeyData.name}`
          )
          return {
            accountId: apiKeyData.claudeConsoleAccountId,
            accountType: 'claude-console'
          }
        } else {
          logger.warn(
            `⚠️ Bound Claude Console account ${apiKeyData.claudeConsoleAccountId} is not available (isActive: ${boundConsoleAccount?.isActive}, status: ${boundConsoleAccount?.status}, schedulable: ${boundConsoleAccount?.schedulable}), falling back to pool`
          )
        }
      }

      // 3. 检查Bedrock账户绑定
      if (apiKeyData.bedrockAccountId) {
        const boundBedrockAccountResult = await bedrockAccountService.getAccount(
          apiKeyData.bedrockAccountId
        )
        if (
          boundBedrockAccountResult.success &&
          boundBedrockAccountResult.data.isActive === true &&
          this._isSchedulable(boundBedrockAccountResult.data.schedulable)
        ) {
          logger.info(
            `🎯 Using bound dedicated Bedrock account: ${boundBedrockAccountResult.data.name} (${apiKeyData.bedrockAccountId}) for API key ${apiKeyData.name}`
          )
          return {
            accountId: apiKeyData.bedrockAccountId,
            accountType: 'bedrock'
          }
        } else {
          logger.warn(
            `⚠️ Bound Bedrock account ${apiKeyData.bedrockAccountId} is not available (isActive: ${boundBedrockAccountResult?.data?.isActive}, schedulable: ${boundBedrockAccountResult?.data?.schedulable}), falling back to pool`
          )
        }
      }

      // CCR 账户不支持绑定（仅通过 ccr, 前缀进行 CCR 路由）

      // 如果有会话哈希，检查是否有已映射的账户
      if (sessionHash) {
        const mappedAccount = await this._getSessionMapping(sessionHash)
        if (mappedAccount) {
          // 当本次请求不是 CCR 前缀时，不允许使用指向 CCR 的粘性会话映射
          if (vendor !== 'ccr' && mappedAccount.accountType === 'ccr') {
            logger.info(
              `ℹ️ Skipping CCR sticky session mapping for non-CCR request; removing mapping for session ${sessionHash}`
            )
            await this._deleteSessionMapping(sessionHash)
          } else {
            // 验证映射的账户是否仍然可用
            const isAvailable = await this._isAccountAvailable(
              mappedAccount.accountId,
              mappedAccount.accountType,
              effectiveModel
            )
            if (isAvailable) {
              // 🚀 智能会话续期：剩余时间少于14天时自动续期到15天（续期正确的 unified 映射键）
              await this._extendSessionMappingTTL(sessionHash)
              logger.info(
                `🎯 Using sticky session account: ${mappedAccount.accountId} (${mappedAccount.accountType}) for session ${sessionHash}`
              )
              return mappedAccount
            } else {
              logger.warn(
                `⚠️ Mapped account ${mappedAccount.accountId} is no longer available, selecting new account`
              )
              await this._deleteSessionMapping(sessionHash)
            }
          }
        }
      }

      // 获取所有可用账户（传递请求的模型进行过滤）
      const availableAccounts = await this._getAllAvailableAccounts(
        apiKeyData,
        effectiveModel,
        false // 仅前缀才走 CCR：默认池不包含 CCR 账户
      )

      if (availableAccounts.length === 0) {
        // 提供更详细的错误信息
        if (effectiveModel) {
          throw new Error(
            `No available Claude accounts support the requested model: ${effectiveModel}`
          )
        } else {
          throw new Error('No available Claude accounts (neither official nor console)')
        }
      }

      // 按优先级和最后使用时间排序
      const sortedAccounts = this._sortAccountsByPriority(availableAccounts)

      // 选择第一个账户
      const selectedAccount = sortedAccounts[0]

      // 如果有会话哈希，建立新的映射
      if (sessionHash) {
        await this._setSessionMapping(
          sessionHash,
          selectedAccount.accountId,
          selectedAccount.accountType
        )
        logger.info(
          `🎯 Created new sticky session mapping: ${selectedAccount.name} (${selectedAccount.accountId}, ${selectedAccount.accountType}) for session ${sessionHash}`
        )
      }

      logger.info(
        `🎯 Selected account: ${selectedAccount.name} (${selectedAccount.accountId}, ${selectedAccount.accountType}) with priority ${selectedAccount.priority} for API key ${apiKeyData.name}`
      )

      return {
        accountId: selectedAccount.accountId,
        accountType: selectedAccount.accountType
      }
    } catch (error) {
      logger.error('❌ Failed to select account for API key:', error)
      throw error
    }
  }

  // 📋 获取所有可用账户（合并官方和Console）
  async _getAllAvailableAccounts(apiKeyData, requestedModel = null, includeCcr = false) {
    const availableAccounts = []

    // 如果API Key绑定了专属账户，优先返回
    // 1. 检查Claude OAuth账户绑定
    if (apiKeyData.claudeAccountId) {
      const boundAccount = await redis.getClaudeAccount(apiKeyData.claudeAccountId)
      if (
        boundAccount &&
        boundAccount.isActive === 'true' &&
        boundAccount.status !== 'error' &&
        boundAccount.status !== 'blocked' &&
        boundAccount.status !== 'temp_error' &&
        this._isSchedulable(boundAccount.schedulable)
      ) {
        const isRateLimited = await claudeAccountService.isAccountRateLimited(boundAccount.id)
        if (!isRateLimited) {
          logger.info(
            `🎯 Using bound dedicated Claude OAuth account: ${boundAccount.name} (${apiKeyData.claudeAccountId})`
          )
          return [
            {
              ...boundAccount,
              accountId: boundAccount.id,
              accountType: 'claude-official',
              priority: parseInt(boundAccount.priority) || 50,
              lastUsedAt: boundAccount.lastUsedAt || '0'
            }
          ]
        }
      } else {
        logger.warn(
          `⚠️ Bound Claude OAuth account ${apiKeyData.claudeAccountId} is not available (isActive: ${boundAccount?.isActive}, status: ${boundAccount?.status}, schedulable: ${boundAccount?.schedulable})`
        )
      }
    }

    // 2. 检查Claude Console账户绑定
    if (apiKeyData.claudeConsoleAccountId) {
      const boundConsoleAccount = await claudeConsoleAccountService.getAccount(
        apiKeyData.claudeConsoleAccountId
      )
      if (
        boundConsoleAccount &&
        boundConsoleAccount.isActive === true &&
        boundConsoleAccount.status === 'active' &&
        this._isSchedulable(boundConsoleAccount.schedulable)
      ) {
        // 主动触发一次额度检查
        try {
          await claudeConsoleAccountService.checkQuotaUsage(boundConsoleAccount.id)
        } catch (e) {
          logger.warn(
            `Failed to check quota for bound Claude Console account ${boundConsoleAccount.name}: ${e.message}`
          )
          // 继续使用该账号
        }

        // 检查限流状态和额度状态
        const isRateLimited = await claudeConsoleAccountService.isAccountRateLimited(
          boundConsoleAccount.id
        )
        const isQuotaExceeded = await claudeConsoleAccountService.isAccountQuotaExceeded(
          boundConsoleAccount.id
        )

        if (!isRateLimited && !isQuotaExceeded) {
          logger.info(
            `🎯 Using bound dedicated Claude Console account: ${boundConsoleAccount.name} (${apiKeyData.claudeConsoleAccountId})`
          )
          return [
            {
              ...boundConsoleAccount,
              accountId: boundConsoleAccount.id,
              accountType: 'claude-console',
              priority: parseInt(boundConsoleAccount.priority) || 50,
              lastUsedAt: boundConsoleAccount.lastUsedAt || '0'
            }
          ]
        }
      } else {
        logger.warn(
          `⚠️ Bound Claude Console account ${apiKeyData.claudeConsoleAccountId} is not available (isActive: ${boundConsoleAccount?.isActive}, status: ${boundConsoleAccount?.status}, schedulable: ${boundConsoleAccount?.schedulable})`
        )
      }
    }

    // 3. 检查Bedrock账户绑定
    if (apiKeyData.bedrockAccountId) {
      const boundBedrockAccountResult = await bedrockAccountService.getAccount(
        apiKeyData.bedrockAccountId
      )
      if (
        boundBedrockAccountResult.success &&
        boundBedrockAccountResult.data.isActive === true &&
        this._isSchedulable(boundBedrockAccountResult.data.schedulable)
      ) {
        logger.info(
          `🎯 Using bound dedicated Bedrock account: ${boundBedrockAccountResult.data.name} (${apiKeyData.bedrockAccountId})`
        )
        return [
          {
            ...boundBedrockAccountResult.data,
            accountId: boundBedrockAccountResult.data.id,
            accountType: 'bedrock',
            priority: parseInt(boundBedrockAccountResult.data.priority) || 50,
            lastUsedAt: boundBedrockAccountResult.data.lastUsedAt || '0'
          }
        ]
      } else {
        logger.warn(
          `⚠️ Bound Bedrock account ${apiKeyData.bedrockAccountId} is not available (isActive: ${boundBedrockAccountResult?.data?.isActive}, schedulable: ${boundBedrockAccountResult?.data?.schedulable})`
        )
      }
    }

    // 获取官方Claude账户（共享池）
    const claudeAccounts = await redis.getAllClaudeAccounts()
    for (const account of claudeAccounts) {
      if (
        account.isActive === 'true' &&
        account.status !== 'error' &&
        account.status !== 'blocked' &&
        account.status !== 'temp_error' &&
        (account.accountType === 'shared' || !account.accountType) && // 兼容旧数据
        this._isSchedulable(account.schedulable)
      ) {
        // 检查是否可调度

        // 检查模型支持
        if (!this._isModelSupportedByAccount(account, 'claude-official', requestedModel)) {
          continue
        }

        // 检查是否被限流
        const isRateLimited = await claudeAccountService.isAccountRateLimited(account.id)
        if (!isRateLimited) {
          availableAccounts.push({
            ...account,
            accountId: account.id,
            accountType: 'claude-official',
            priority: parseInt(account.priority) || 50, // 默认优先级50
            lastUsedAt: account.lastUsedAt || '0'
          })
        }
      }
    }

    // 获取Claude Console账户
    const consoleAccounts = await claudeConsoleAccountService.getAllAccounts()
    logger.info(`📋 Found ${consoleAccounts.length} total Claude Console accounts`)

    for (const account of consoleAccounts) {
      logger.info(
        `🔍 Checking Claude Console account: ${account.name} - isActive: ${account.isActive}, status: ${account.status}, accountType: ${account.accountType}, schedulable: ${account.schedulable}`
      )

      // 注意：getAllAccounts返回的isActive是布尔值
      if (
        account.isActive === true &&
        account.status === 'active' &&
        account.accountType === 'shared' &&
        this._isSchedulable(account.schedulable)
      ) {
        // 检查是否可调度

        // 检查模型支持
        if (!this._isModelSupportedByAccount(account, 'claude-console', requestedModel)) {
          continue
        }

        // 主动触发一次额度检查，确保状态即时生效
        try {
          await claudeConsoleAccountService.checkQuotaUsage(account.id)
        } catch (e) {
          logger.warn(
            `Failed to check quota for Claude Console account ${account.name}: ${e.message}`
          )
          // 继续处理该账号
        }

        // 检查是否被限流
        const isRateLimited = await claudeConsoleAccountService.isAccountRateLimited(account.id)
        const isQuotaExceeded = await claudeConsoleAccountService.isAccountQuotaExceeded(account.id)

        if (!isRateLimited && !isQuotaExceeded) {
          availableAccounts.push({
            ...account,
            accountId: account.id,
            accountType: 'claude-console',
            priority: parseInt(account.priority) || 50,
            lastUsedAt: account.lastUsedAt || '0'
          })
          logger.info(
            `✅ Added Claude Console account to available pool: ${account.name} (priority: ${account.priority})`
          )
        } else {
          if (isRateLimited) {
            logger.warn(`⚠️ Claude Console account ${account.name} is rate limited`)
          }
          if (isQuotaExceeded) {
            logger.warn(`💰 Claude Console account ${account.name} quota exceeded`)
          }
        }
      } else {
        logger.info(
          `❌ Claude Console account ${account.name} not eligible - isActive: ${account.isActive}, status: ${account.status}, accountType: ${account.accountType}, schedulable: ${account.schedulable}`
        )
      }
    }

    // 获取Bedrock账户（共享池）
    const bedrockAccountsResult = await bedrockAccountService.getAllAccounts()
    if (bedrockAccountsResult.success) {
      const bedrockAccounts = bedrockAccountsResult.data
      logger.info(`📋 Found ${bedrockAccounts.length} total Bedrock accounts`)

      for (const account of bedrockAccounts) {
        logger.info(
          `🔍 Checking Bedrock account: ${account.name} - isActive: ${account.isActive}, accountType: ${account.accountType}, schedulable: ${account.schedulable}`
        )

        if (
          account.isActive === true &&
          account.accountType === 'shared' &&
          this._isSchedulable(account.schedulable)
        ) {
          // 检查是否可调度

          availableAccounts.push({
            ...account,
            accountId: account.id,
            accountType: 'bedrock',
            priority: parseInt(account.priority) || 50,
            lastUsedAt: account.lastUsedAt || '0'
          })
          logger.info(
            `✅ Added Bedrock account to available pool: ${account.name} (priority: ${account.priority})`
          )
        } else {
          logger.info(
            `❌ Bedrock account ${account.name} not eligible - isActive: ${account.isActive}, accountType: ${account.accountType}, schedulable: ${account.schedulable}`
          )
        }
      }
    }

    // 获取CCR账户（共享池）- 仅当明确要求包含时
    if (includeCcr) {
      const ccrAccounts = await ccrAccountService.getAllAccounts()
      logger.info(`📋 Found ${ccrAccounts.length} total CCR accounts`)

      for (const account of ccrAccounts) {
        logger.info(
          `🔍 Checking CCR account: ${account.name} - isActive: ${account.isActive}, status: ${account.status}, accountType: ${account.accountType}, schedulable: ${account.schedulable}`
        )

        if (
          account.isActive === true &&
          account.status === 'active' &&
          account.accountType === 'shared' &&
          this._isSchedulable(account.schedulable)
        ) {
          // 检查模型支持
          if (!this._isModelSupportedByAccount(account, 'ccr', requestedModel)) {
            continue
          }

          // 检查是否被限流
          const isRateLimited = await ccrAccountService.isAccountRateLimited(account.id)
          const isQuotaExceeded = await ccrAccountService.isAccountQuotaExceeded(account.id)

          if (!isRateLimited && !isQuotaExceeded) {
            availableAccounts.push({
              ...account,
              accountId: account.id,
              accountType: 'ccr',
              priority: parseInt(account.priority) || 50,
              lastUsedAt: account.lastUsedAt || '0'
            })
            logger.info(
              `✅ Added CCR account to available pool: ${account.name} (priority: ${account.priority})`
            )
          } else {
            if (isRateLimited) {
              logger.warn(`⚠️ CCR account ${account.name} is rate limited`)
            }
            if (isQuotaExceeded) {
              logger.warn(`💰 CCR account ${account.name} quota exceeded`)
            }
          }
        } else {
          logger.info(
            `❌ CCR account ${account.name} not eligible - isActive: ${account.isActive}, status: ${account.status}, accountType: ${account.accountType}, schedulable: ${account.schedulable}`
          )
        }
      }
    }

    logger.info(
      `📊 Total available accounts: ${availableAccounts.length} (Claude: ${availableAccounts.filter((a) => a.accountType === 'claude-official').length}, Console: ${availableAccounts.filter((a) => a.accountType === 'claude-console').length}, Bedrock: ${availableAccounts.filter((a) => a.accountType === 'bedrock').length}, CCR: ${availableAccounts.filter((a) => a.accountType === 'ccr').length})`
    )
    return availableAccounts
  }

  // 🔢 按优先级和最后使用时间排序账户
  _sortAccountsByPriority(accounts) {
    return accounts.sort((a, b) => {
      // 首先按优先级排序（数字越小优先级越高）
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }

      // 优先级相同时，按最后使用时间排序（最久未使用的优先）
      const aLastUsed = new Date(a.lastUsedAt || 0).getTime()
      const bLastUsed = new Date(b.lastUsedAt || 0).getTime()
      return aLastUsed - bLastUsed
    })
  }

  // 🔍 检查账户是否可用
  async _isAccountAvailable(accountId, accountType, requestedModel = null) {
    try {
      if (accountType === 'claude-official') {
        const account = await redis.getClaudeAccount(accountId)
        if (
          !account ||
          account.isActive !== 'true' ||
          account.status === 'error' ||
          account.status === 'temp_error'
        ) {
          return false
        }
        // 检查是否可调度
        if (!this._isSchedulable(account.schedulable)) {
          logger.info(`🚫 Account ${accountId} is not schedulable`)
          return false
        }

        // 检查模型兼容性
        if (
          !this._isModelSupportedByAccount(
            account,
            'claude-official',
            requestedModel,
            'in session check'
          )
        ) {
          return false
        }

        // 检查是否限流或过载
        const isRateLimited = await claudeAccountService.isAccountRateLimited(accountId)
        const isOverloaded = await claudeAccountService.isAccountOverloaded(accountId)
        return !isRateLimited && !isOverloaded
      } else if (accountType === 'claude-console') {
        const account = await claudeConsoleAccountService.getAccount(accountId)
        if (!account || !account.isActive) {
          return false
        }
        // 检查账户状态
        if (
          account.status !== 'active' &&
          account.status !== 'unauthorized' &&
          account.status !== 'overloaded'
        ) {
          return false
        }
        // 检查是否可调度
        if (!this._isSchedulable(account.schedulable)) {
          logger.info(`🚫 Claude Console account ${accountId} is not schedulable`)
          return false
        }
        // 检查模型支持
        if (
          !this._isModelSupportedByAccount(
            account,
            'claude-console',
            requestedModel,
            'in session check'
          )
        ) {
          return false
        }
        // 检查是否超额
        try {
          await claudeConsoleAccountService.checkQuotaUsage(accountId)
        } catch (e) {
          logger.warn(`Failed to check quota for Claude Console account ${accountId}: ${e.message}`)
          // 继续处理
        }

        // 检查是否被限流
        if (await claudeConsoleAccountService.isAccountRateLimited(accountId)) {
          return false
        }
        if (await claudeConsoleAccountService.isAccountQuotaExceeded(accountId)) {
          return false
        }
        // 检查是否未授权（401错误）
        if (account.status === 'unauthorized') {
          return false
        }
        // 检查是否过载（529错误）
        if (await claudeConsoleAccountService.isAccountOverloaded(accountId)) {
          return false
        }
        return true
      } else if (accountType === 'bedrock') {
        const accountResult = await bedrockAccountService.getAccount(accountId)
        if (!accountResult.success || !accountResult.data.isActive) {
          return false
        }
        // 检查是否可调度
        if (!this._isSchedulable(accountResult.data.schedulable)) {
          logger.info(`🚫 Bedrock account ${accountId} is not schedulable`)
          return false
        }
        // Bedrock账户暂不需要限流检查，因为AWS管理限流
        return true
      } else if (accountType === 'ccr') {
        const account = await ccrAccountService.getAccount(accountId)
        if (!account || !account.isActive) {
          return false
        }
        // 检查账户状态
        if (
          account.status !== 'active' &&
          account.status !== 'unauthorized' &&
          account.status !== 'overloaded'
        ) {
          return false
        }
        // 检查是否可调度
        if (!this._isSchedulable(account.schedulable)) {
          logger.info(`🚫 CCR account ${accountId} is not schedulable`)
          return false
        }
        // 检查模型支持
        if (!this._isModelSupportedByAccount(account, 'ccr', requestedModel, 'in session check')) {
          return false
        }
        // 检查是否超额
        try {
          await ccrAccountService.checkQuotaUsage(accountId)
        } catch (e) {
          logger.warn(`Failed to check quota for CCR account ${accountId}: ${e.message}`)
          // 继续处理
        }

        // 检查是否被限流
        if (await ccrAccountService.isAccountRateLimited(accountId)) {
          return false
        }
        if (await ccrAccountService.isAccountQuotaExceeded(accountId)) {
          return false
        }
        // 检查是否未授权（401错误）
        if (account.status === 'unauthorized') {
          return false
        }
        // 检查是否过载（529错误）
        if (await ccrAccountService.isAccountOverloaded(accountId)) {
          return false
        }
        return true
      }
      return false
    } catch (error) {
      logger.warn(`⚠️ Failed to check account availability: ${accountId}`, error)
      return false
    }
  }

  // 🔗 获取会话映射
  async _getSessionMapping(sessionHash) {
    const client = redis.getClientSafe()
    const mappingData = await client.get(`${this.SESSION_MAPPING_PREFIX}${sessionHash}`)

    if (mappingData) {
      try {
        return JSON.parse(mappingData)
      } catch (error) {
        logger.warn('⚠️ Failed to parse session mapping:', error)
        return null
      }
    }

    return null
  }

  // 💾 设置会话映射
  async _setSessionMapping(sessionHash, accountId, accountType) {
    const client = redis.getClientSafe()
    const mappingData = JSON.stringify({ accountId, accountType })
    // 依据配置设置TTL（小时）
    const appConfig = require('../../config/config')
    const ttlHours = appConfig.session?.stickyTtlHours || 1
    const ttlSeconds = Math.max(1, Math.floor(ttlHours * 60 * 60))
    await client.setex(`${this.SESSION_MAPPING_PREFIX}${sessionHash}`, ttlSeconds, mappingData)
  }

  // 🗑️ 删除会话映射
  async _deleteSessionMapping(sessionHash) {
    const client = redis.getClientSafe()
    await client.del(`${this.SESSION_MAPPING_PREFIX}${sessionHash}`)
  }

  // 🔁 续期统一调度会话映射TTL（针对 unified_claude_session_mapping:* 键），遵循会话配置
  async _extendSessionMappingTTL(sessionHash) {
    try {
      const client = redis.getClientSafe()
      const key = `${this.SESSION_MAPPING_PREFIX}${sessionHash}`
      const remainingTTL = await client.ttl(key)

      // -2: key 不存在；-1: 无过期时间
      if (remainingTTL === -2) {
        return false
      }
      if (remainingTTL === -1) {
        return true
      }

      const appConfig = require('../../config/config')
      const ttlHours = appConfig.session?.stickyTtlHours || 1
      const renewalThresholdMinutes = appConfig.session?.renewalThresholdMinutes || 0

      // 阈值为0则不续期
      if (!renewalThresholdMinutes) {
        return true
      }

      const fullTTL = Math.max(1, Math.floor(ttlHours * 60 * 60))
      const threshold = Math.max(0, Math.floor(renewalThresholdMinutes * 60))

      if (remainingTTL < threshold) {
        await client.expire(key, fullTTL)
        logger.debug(
          `🔄 Renewed unified session TTL: ${sessionHash} (was ${Math.round(remainingTTL / 60)}m, renewed to ${ttlHours}h)`
        )
      } else {
        logger.debug(
          `✅ Unified session TTL sufficient: ${sessionHash} (remaining ${Math.round(remainingTTL / 60)}m)`
        )
      }
      return true
    } catch (error) {
      logger.error('❌ Failed to extend unified session TTL:', error)
      return false
    }
  }

  // 🚫 标记账户为限流状态
  async markAccountRateLimited(
    accountId,
    accountType,
    sessionHash = null,
    rateLimitResetTimestamp = null
  ) {
    try {
      if (accountType === 'claude-official') {
        await claudeAccountService.markAccountRateLimited(
          accountId,
          sessionHash,
          rateLimitResetTimestamp
        )
      } else if (accountType === 'claude-console') {
        await claudeConsoleAccountService.markAccountRateLimited(accountId)
      } else if (accountType === 'ccr') {
        await ccrAccountService.markAccountRateLimited(accountId)
      }

      // 删除会话映射
      if (sessionHash) {
        await this._deleteSessionMapping(sessionHash)
      }

      return { success: true }
    } catch (error) {
      logger.error(
        `❌ Failed to mark account as rate limited: ${accountId} (${accountType})`,
        error
      )
      throw error
    }
  }

  // ✅ 移除账户的限流状态
  async removeAccountRateLimit(accountId, accountType) {
    try {
      if (accountType === 'claude-official') {
        await claudeAccountService.removeAccountRateLimit(accountId)
      } else if (accountType === 'claude-console') {
        await claudeConsoleAccountService.removeAccountRateLimit(accountId)
      } else if (accountType === 'ccr') {
        await ccrAccountService.removeAccountRateLimit(accountId)
      }

      return { success: true }
    } catch (error) {
      logger.error(
        `❌ Failed to remove rate limit for account: ${accountId} (${accountType})`,
        error
      )
      throw error
    }
  }

  // 🔍 检查账户是否处于限流状态
  async isAccountRateLimited(accountId, accountType) {
    try {
      if (accountType === 'claude-official') {
        return await claudeAccountService.isAccountRateLimited(accountId)
      } else if (accountType === 'claude-console') {
        return await claudeConsoleAccountService.isAccountRateLimited(accountId)
      } else if (accountType === 'ccr') {
        return await ccrAccountService.isAccountRateLimited(accountId)
      }
      return false
    } catch (error) {
      logger.error(`❌ Failed to check rate limit status: ${accountId} (${accountType})`, error)
      return false
    }
  }

  // 🚫 标记账户为未授权状态（401错误）
  async markAccountUnauthorized(accountId, accountType, sessionHash = null) {
    try {
      // 只处理claude-official类型的账户，不处理claude-console和gemini
      if (accountType === 'claude-official') {
        await claudeAccountService.markAccountUnauthorized(accountId, sessionHash)

        // 删除会话映射
        if (sessionHash) {
          await this._deleteSessionMapping(sessionHash)
        }

        logger.warn(`🚫 Account ${accountId} marked as unauthorized due to consecutive 401 errors`)
      } else {
        logger.info(
          `ℹ️ Skipping unauthorized marking for non-Claude OAuth account: ${accountId} (${accountType})`
        )
      }

      return { success: true }
    } catch (error) {
      logger.error(
        `❌ Failed to mark account as unauthorized: ${accountId} (${accountType})`,
        error
      )
      throw error
    }
  }

  // 🚫 标记账户为被封锁状态（403错误）
  async markAccountBlocked(accountId, accountType, sessionHash = null) {
    try {
      // 只处理claude-official类型的账户，不处理claude-console和gemini
      if (accountType === 'claude-official') {
        await claudeAccountService.markAccountBlocked(accountId, sessionHash)

        // 删除会话映射
        if (sessionHash) {
          await this._deleteSessionMapping(sessionHash)
        }

        logger.warn(`🚫 Account ${accountId} marked as blocked due to 403 error`)
      } else {
        logger.info(
          `ℹ️ Skipping blocked marking for non-Claude OAuth account: ${accountId} (${accountType})`
        )
      }

      return { success: true }
    } catch (error) {
      logger.error(`❌ Failed to mark account as blocked: ${accountId} (${accountType})`, error)
      throw error
    }
  }

  // 🚫 标记Claude Console账户为封锁状态（模型不支持）
  async blockConsoleAccount(accountId, reason) {
    try {
      await claudeConsoleAccountService.blockAccount(accountId, reason)
      return { success: true }
    } catch (error) {
      logger.error(`❌ Failed to block console account: ${accountId}`, error)
      throw error
    }
  }

  // 👥 从分组中选择账户
  async selectAccountFromGroup(
    groupId,
    sessionHash = null,
    requestedModel = null,
    allowCcr = false
  ) {
    try {
      // 获取分组信息
      const group = await accountGroupService.getGroup(groupId)
      if (!group) {
        throw new Error(`Group ${groupId} not found`)
      }

      logger.info(`👥 Selecting account from group: ${group.name} (${group.platform})`)

      // 如果有会话哈希，检查是否有已映射的账户
      if (sessionHash) {
        const mappedAccount = await this._getSessionMapping(sessionHash)
        if (mappedAccount) {
          // 验证映射的账户是否属于这个分组
          const memberIds = await accountGroupService.getGroupMembers(groupId)
          if (memberIds.includes(mappedAccount.accountId)) {
            // 非 CCR 请求时不允许 CCR 粘性映射
            if (!allowCcr && mappedAccount.accountType === 'ccr') {
              await this._deleteSessionMapping(sessionHash)
            } else {
              const isAvailable = await this._isAccountAvailable(
                mappedAccount.accountId,
                mappedAccount.accountType,
                requestedModel
              )
              if (isAvailable) {
                // 🚀 智能会话续期：续期 unified 映射键
                await this._extendSessionMappingTTL(sessionHash)
                logger.info(
                  `🎯 Using sticky session account from group: ${mappedAccount.accountId} (${mappedAccount.accountType}) for session ${sessionHash}`
                )
                return mappedAccount
              }
            }
          }
          // 如果映射的账户不可用或不在分组中，删除映射
          await this._deleteSessionMapping(sessionHash)
        }
      }

      // 获取分组内的所有账户
      const memberIds = await accountGroupService.getGroupMembers(groupId)
      if (memberIds.length === 0) {
        throw new Error(`Group ${group.name} has no members`)
      }

      const availableAccounts = []

      // 获取所有成员账户的详细信息
      for (const memberId of memberIds) {
        let account = null
        let accountType = null

        // 根据平台类型获取账户
        if (group.platform === 'claude') {
          // 先尝试官方账户
          account = await redis.getClaudeAccount(memberId)
          if (account?.id) {
            accountType = 'claude-official'
          } else {
            // 尝试Console账户
            account = await claudeConsoleAccountService.getAccount(memberId)
            if (account) {
              accountType = 'claude-console'
            } else {
              // 尝试CCR账户（仅允许在 allowCcr 为 true 时）
              if (allowCcr) {
                account = await ccrAccountService.getAccount(memberId)
                if (account) {
                  accountType = 'ccr'
                }
              }
            }
          }
        } else if (group.platform === 'gemini') {
          // Gemini暂时不支持，预留接口
          logger.warn('⚠️ Gemini group scheduling not yet implemented')
          continue
        }

        if (!account) {
          logger.warn(`⚠️ Account ${memberId} not found in group ${group.name}`)
          continue
        }

        // 检查账户是否可用
        const isActive =
          accountType === 'claude-official'
            ? account.isActive === 'true'
            : account.isActive === true

        const status =
          accountType === 'claude-official'
            ? account.status !== 'error' && account.status !== 'blocked'
            : accountType === 'ccr'
              ? account.status === 'active'
              : account.status === 'active'

        if (isActive && status && this._isSchedulable(account.schedulable)) {
          // 检查模型支持
          if (!this._isModelSupportedByAccount(account, accountType, requestedModel, 'in group')) {
            continue
          }

          // 检查是否被限流
          const isRateLimited = await this.isAccountRateLimited(account.id, accountType)
          if (!isRateLimited) {
            availableAccounts.push({
              ...account,
              accountId: account.id,
              accountType,
              priority: parseInt(account.priority) || 50,
              lastUsedAt: account.lastUsedAt || '0'
            })
          }
        }
      }

      if (availableAccounts.length === 0) {
        throw new Error(`No available accounts in group ${group.name}`)
      }

      // 使用现有的优先级排序逻辑
      const sortedAccounts = this._sortAccountsByPriority(availableAccounts)

      // 选择第一个账户
      const selectedAccount = sortedAccounts[0]

      // 如果有会话哈希，建立新的映射
      if (sessionHash) {
        await this._setSessionMapping(
          sessionHash,
          selectedAccount.accountId,
          selectedAccount.accountType
        )
        logger.info(
          `🎯 Created new sticky session mapping in group: ${selectedAccount.name} (${selectedAccount.accountId}, ${selectedAccount.accountType}) for session ${sessionHash}`
        )
      }

      logger.info(
        `🎯 Selected account from group ${group.name}: ${selectedAccount.name} (${selectedAccount.accountId}, ${selectedAccount.accountType}) with priority ${selectedAccount.priority}`
      )

      return {
        accountId: selectedAccount.accountId,
        accountType: selectedAccount.accountType
      }
    } catch (error) {
      logger.error(`❌ Failed to select account from group ${groupId}:`, error)
      throw error
    }
  }

  // 🎯 专门选择CCR账户（仅限CCR前缀路由使用）
  async _selectCcrAccount(apiKeyData, sessionHash = null, effectiveModel = null) {
    try {
      // 1. 检查会话粘性
      if (sessionHash) {
        const mappedAccount = await this._getSessionMapping(sessionHash)
        if (mappedAccount && mappedAccount.accountType === 'ccr') {
          // 验证映射的CCR账户是否仍然可用
          const isAvailable = await this._isAccountAvailable(
            mappedAccount.accountId,
            mappedAccount.accountType,
            effectiveModel
          )
          if (isAvailable) {
            // 🚀 智能会话续期：续期 unified 映射键
            await this._extendSessionMappingTTL(sessionHash)
            logger.info(
              `🎯 Using sticky CCR session account: ${mappedAccount.accountId} for session ${sessionHash}`
            )
            return mappedAccount
          } else {
            logger.warn(
              `⚠️ Mapped CCR account ${mappedAccount.accountId} is no longer available, selecting new account`
            )
            await this._deleteSessionMapping(sessionHash)
          }
        }
      }

      // 2. 获取所有可用的CCR账户
      const availableCcrAccounts = await this._getAvailableCcrAccounts(effectiveModel)

      if (availableCcrAccounts.length === 0) {
        throw new Error(
          `No available CCR accounts support the requested model: ${effectiveModel || 'unspecified'}`
        )
      }

      // 3. 按优先级和最后使用时间排序
      const sortedAccounts = this._sortAccountsByPriority(availableCcrAccounts)
      const selectedAccount = sortedAccounts[0]

      // 4. 建立会话映射
      if (sessionHash) {
        await this._setSessionMapping(
          sessionHash,
          selectedAccount.accountId,
          selectedAccount.accountType
        )
        logger.info(
          `🎯 Created new sticky CCR session mapping: ${selectedAccount.name} (${selectedAccount.accountId}) for session ${sessionHash}`
        )
      }

      logger.info(
        `🎯 Selected CCR account: ${selectedAccount.name} (${selectedAccount.accountId}) with priority ${selectedAccount.priority} for API key ${apiKeyData.name}`
      )

      return {
        accountId: selectedAccount.accountId,
        accountType: selectedAccount.accountType
      }
    } catch (error) {
      logger.error('❌ Failed to select CCR account:', error)
      throw error
    }
  }

  // 📋 获取所有可用的CCR账户
  async _getAvailableCcrAccounts(requestedModel = null) {
    const availableAccounts = []

    try {
      const ccrAccounts = await ccrAccountService.getAllAccounts()
      logger.info(`📋 Found ${ccrAccounts.length} total CCR accounts for CCR-only selection`)

      for (const account of ccrAccounts) {
        logger.debug(
          `🔍 Checking CCR account: ${account.name} - isActive: ${account.isActive}, status: ${account.status}, accountType: ${account.accountType}, schedulable: ${account.schedulable}`
        )

        if (
          account.isActive === true &&
          account.status === 'active' &&
          account.accountType === 'shared' &&
          this._isSchedulable(account.schedulable)
        ) {
          // 检查模型支持
          if (!this._isModelSupportedByAccount(account, 'ccr', requestedModel)) {
            logger.debug(`CCR account ${account.name} does not support model ${requestedModel}`)
            continue
          }

          // 检查是否被限流或超额
          const isRateLimited = await ccrAccountService.isAccountRateLimited(account.id)
          const isQuotaExceeded = await ccrAccountService.isAccountQuotaExceeded(account.id)
          const isOverloaded = await ccrAccountService.isAccountOverloaded(account.id)

          if (!isRateLimited && !isQuotaExceeded && !isOverloaded) {
            availableAccounts.push({
              ...account,
              accountId: account.id,
              accountType: 'ccr',
              priority: parseInt(account.priority) || 50,
              lastUsedAt: account.lastUsedAt || '0'
            })
            logger.debug(`✅ Added CCR account to available pool: ${account.name}`)
          } else {
            logger.debug(
              `❌ CCR account ${account.name} not available - rateLimited: ${isRateLimited}, quotaExceeded: ${isQuotaExceeded}, overloaded: ${isOverloaded}`
            )
          }
        } else {
          logger.debug(
            `❌ CCR account ${account.name} not eligible - isActive: ${account.isActive}, status: ${account.status}, accountType: ${account.accountType}, schedulable: ${account.schedulable}`
          )
        }
      }

      logger.info(`📊 Total available CCR accounts: ${availableAccounts.length}`)
      return availableAccounts
    } catch (error) {
      logger.error('❌ Failed to get available CCR accounts:', error)
      return []
    }
  }
}

module.exports = new UnifiedClaudeScheduler()

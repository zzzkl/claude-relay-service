/**
 * 限流状态自动清理服务
 * 定期检查并清理所有类型账号的过期限流状态
 */

const logger = require('../utils/logger')
const openaiAccountService = require('./openaiAccountService')
const claudeAccountService = require('./claudeAccountService')
const claudeConsoleAccountService = require('./claudeConsoleAccountService')
const unifiedOpenAIScheduler = require('./unifiedOpenAIScheduler')
const webhookService = require('./webhookService')

class RateLimitCleanupService {
  constructor() {
    this.cleanupInterval = null
    this.isRunning = false
    // 默认每5分钟检查一次
    this.intervalMs = 5 * 60 * 1000
    // 存储已清理的账户信息，用于发送恢复通知
    this.clearedAccounts = []
  }

  /**
   * 启动自动清理服务
   * @param {number} intervalMinutes - 检查间隔（分钟），默认5分钟
   */
  start(intervalMinutes = 5) {
    if (this.cleanupInterval) {
      logger.warn('⚠️ Rate limit cleanup service is already running')
      return
    }

    this.intervalMs = intervalMinutes * 60 * 1000

    logger.info(`🧹 Starting rate limit cleanup service (interval: ${intervalMinutes} minutes)`)

    // 立即执行一次清理
    this.performCleanup()

    // 设置定期执行
    this.cleanupInterval = setInterval(() => {
      this.performCleanup()
    }, this.intervalMs)
  }

  /**
   * 停止自动清理服务
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      logger.info('🛑 Rate limit cleanup service stopped')
    }
  }

  /**
   * 执行一次清理检查
   */
  async performCleanup() {
    if (this.isRunning) {
      logger.debug('⏭️ Cleanup already in progress, skipping this cycle')
      return
    }

    this.isRunning = true
    const startTime = Date.now()

    try {
      logger.debug('🔍 Starting rate limit cleanup check...')

      const results = {
        openai: { checked: 0, cleared: 0, errors: [] },
        claude: { checked: 0, cleared: 0, errors: [] },
        claudeConsole: { checked: 0, cleared: 0, errors: [] }
      }

      // 清理 OpenAI 账号
      await this.cleanupOpenAIAccounts(results.openai)

      // 清理 Claude 账号
      await this.cleanupClaudeAccounts(results.claude)

      // 清理 Claude Console 账号
      await this.cleanupClaudeConsoleAccounts(results.claudeConsole)

      const totalChecked =
        results.openai.checked + results.claude.checked + results.claudeConsole.checked
      const totalCleared =
        results.openai.cleared + results.claude.cleared + results.claudeConsole.cleared
      const duration = Date.now() - startTime

      if (totalCleared > 0) {
        logger.info(
          `✅ Rate limit cleanup completed: ${totalCleared} accounts cleared out of ${totalChecked} checked (${duration}ms)`
        )
        logger.info(`   OpenAI: ${results.openai.cleared}/${results.openai.checked}`)
        logger.info(`   Claude: ${results.claude.cleared}/${results.claude.checked}`)
        logger.info(
          `   Claude Console: ${results.claudeConsole.cleared}/${results.claudeConsole.checked}`
        )

        // 发送 webhook 恢复通知
        if (this.clearedAccounts.length > 0) {
          await this.sendRecoveryNotifications()
        }
      } else {
        logger.debug(
          `🔍 Rate limit cleanup check completed: no expired limits found (${duration}ms)`
        )
      }

      // 清空已清理账户列表
      this.clearedAccounts = []

      // 记录错误
      const allErrors = [
        ...results.openai.errors,
        ...results.claude.errors,
        ...results.claudeConsole.errors
      ]
      if (allErrors.length > 0) {
        logger.warn(`⚠️ Encountered ${allErrors.length} errors during cleanup:`, allErrors)
      }
    } catch (error) {
      logger.error('❌ Rate limit cleanup failed:', error)
    } finally {
      this.isRunning = false
    }
  }

  /**
   * 清理 OpenAI 账号的过期限流
   */
  async cleanupOpenAIAccounts(result) {
    try {
      const accounts = await openaiAccountService.getAllAccounts()

      for (const account of accounts) {
        // 只检查标记为限流的账号
        if (account.rateLimitStatus === 'limited') {
          result.checked++

          try {
            // 使用 unifiedOpenAIScheduler 的检查方法，它会自动清除过期的限流
            const isStillLimited = await unifiedOpenAIScheduler.isAccountRateLimited(account.id)

            if (!isStillLimited) {
              result.cleared++
              logger.info(
                `🧹 Auto-cleared expired rate limit for OpenAI account: ${account.name} (${account.id})`
              )

              // 记录已清理的账户信息
              this.clearedAccounts.push({
                platform: 'OpenAI',
                accountId: account.id,
                accountName: account.name,
                previousStatus: 'rate_limited',
                currentStatus: 'active'
              })
            }
          } catch (error) {
            result.errors.push({
              accountId: account.id,
              accountName: account.name,
              error: error.message
            })
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup OpenAI accounts:', error)
      result.errors.push({ error: error.message })
    }
  }

  /**
   * 清理 Claude 账号的过期限流
   */
  async cleanupClaudeAccounts(result) {
    try {
      const accounts = await claudeAccountService.getAllAccounts()

      for (const account of accounts) {
        // 只检查标记为限流的账号
        if (account.rateLimitStatus === 'limited' || account.rateLimitedAt) {
          result.checked++

          try {
            // 使用 claudeAccountService 的检查方法，它会自动清除过期的限流
            const isStillLimited = await claudeAccountService.isAccountRateLimited(account.id)

            if (!isStillLimited) {
              result.cleared++
              logger.info(
                `🧹 Auto-cleared expired rate limit for Claude account: ${account.name} (${account.id})`
              )

              // 记录已清理的账户信息
              this.clearedAccounts.push({
                platform: 'Claude',
                accountId: account.id,
                accountName: account.name,
                previousStatus: 'rate_limited',
                currentStatus: 'active'
              })
            }
          } catch (error) {
            result.errors.push({
              accountId: account.id,
              accountName: account.name,
              error: error.message
            })
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup Claude accounts:', error)
      result.errors.push({ error: error.message })
    }
  }

  /**
   * 清理 Claude Console 账号的过期限流
   */
  async cleanupClaudeConsoleAccounts(result) {
    try {
      const accounts = await claudeConsoleAccountService.getAllAccounts()

      for (const account of accounts) {
        // 检查两种状态字段：rateLimitStatus 和 status
        const hasRateLimitStatus = account.rateLimitStatus === 'limited'
        const hasStatusRateLimited = account.status === 'rate_limited'

        if (hasRateLimitStatus || hasStatusRateLimited) {
          result.checked++

          try {
            // 使用 claudeConsoleAccountService 的检查方法，它会自动清除过期的限流
            const isStillLimited = await claudeConsoleAccountService.isAccountRateLimited(
              account.id
            )

            if (!isStillLimited) {
              result.cleared++

              // 如果 status 字段是 rate_limited，需要额外清理
              if (hasStatusRateLimited && !hasRateLimitStatus) {
                await claudeConsoleAccountService.updateAccount(account.id, {
                  status: 'active'
                })
              }

              logger.info(
                `🧹 Auto-cleared expired rate limit for Claude Console account: ${account.name} (${account.id})`
              )

              // 记录已清理的账户信息
              this.clearedAccounts.push({
                platform: 'Claude Console',
                accountId: account.id,
                accountName: account.name,
                previousStatus: 'rate_limited',
                currentStatus: 'active'
              })
            }
          } catch (error) {
            result.errors.push({
              accountId: account.id,
              accountName: account.name,
              error: error.message
            })
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup Claude Console accounts:', error)
      result.errors.push({ error: error.message })
    }
  }

  /**
   * 手动触发一次清理（供 API 或 CLI 调用）
   */
  async manualCleanup() {
    logger.info('🧹 Manual rate limit cleanup triggered')
    await this.performCleanup()
  }

  /**
   * 发送限流恢复通知
   */
  async sendRecoveryNotifications() {
    try {
      // 按平台分组账户
      const groupedAccounts = {}
      for (const account of this.clearedAccounts) {
        if (!groupedAccounts[account.platform]) {
          groupedAccounts[account.platform] = []
        }
        groupedAccounts[account.platform].push(account)
      }

      // 构建通知消息
      const platforms = Object.keys(groupedAccounts)
      const totalAccounts = this.clearedAccounts.length

      let message = `🎉 共有 ${totalAccounts} 个账户的限流状态已恢复\n\n`

      for (const platform of platforms) {
        const accounts = groupedAccounts[platform]
        message += `**${platform}** (${accounts.length} 个):\n`
        for (const account of accounts) {
          message += `• ${account.accountName} (ID: ${account.accountId})\n`
        }
        message += '\n'
      }

      // 发送 webhook 通知
      await webhookService.sendNotification('rateLimitRecovery', {
        title: '限流恢复通知',
        message,
        totalAccounts,
        platforms: Object.keys(groupedAccounts),
        accounts: this.clearedAccounts,
        timestamp: new Date().toISOString()
      })

      logger.info(`📢 已发送限流恢复通知，涉及 ${totalAccounts} 个账户`)
    } catch (error) {
      logger.error('❌ 发送限流恢复通知失败:', error)
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      running: !!this.cleanupInterval,
      intervalMinutes: this.intervalMs / (60 * 1000),
      isProcessing: this.isRunning
    }
  }
}

// 创建单例实例
const rateLimitCleanupService = new RateLimitCleanupService()

module.exports = rateLimitCleanupService

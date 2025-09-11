const logger = require('../utils/logger')

/**
 * 浏览器/Chrome插件兜底中间件
 * 专门处理第三方插件的兼容性问题
 */
const browserFallbackMiddleware = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || ''
  const origin = req.headers['origin'] || ''
  const authHeader = req.headers['authorization'] || req.headers['x-api-key'] || ''

  // 检查是否为Chrome插件或浏览器请求
  const isChromeExtension = origin.startsWith('chrome-extension://')
  const isBrowserRequest = userAgent.includes('Mozilla/') && userAgent.includes('Chrome/')
  const hasApiKey = authHeader.startsWith('cr_') // 我们的API Key格式

  if ((isChromeExtension || isBrowserRequest) && hasApiKey) {
    // 为Chrome插件请求添加特殊标记
    req.isBrowserFallback = true
    req.originalUserAgent = userAgent

    // 🆕 关键修改：伪装成claude-cli请求以绕过客户端限制
    req.headers['user-agent'] = 'claude-cli/1.0.110 (external, cli, browser-fallback)'

    // 确保设置正确的认证头
    if (!req.headers['authorization'] && req.headers['x-api-key']) {
      req.headers['authorization'] = `Bearer ${req.headers['x-api-key']}`
    }

    // 添加必要的Anthropic头
    if (!req.headers['anthropic-version']) {
      req.headers['anthropic-version'] = '2023-06-01'
    }

    if (!req.headers['anthropic-dangerous-direct-browser-access']) {
      req.headers['anthropic-dangerous-direct-browser-access'] = 'true'
    }

    logger.api(
      `🔧 Browser fallback activated for ${isChromeExtension ? 'Chrome extension' : 'browser'} request`
    )
    logger.api(`   Original User-Agent: "${req.originalUserAgent}"`)
    logger.api(`   Origin: "${origin}"`)
    logger.api(`   Modified User-Agent: "${req.headers['user-agent']}"`)
  }

  next()
}

module.exports = {
  browserFallbackMiddleware
}

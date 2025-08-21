#!/usr/bin/env node

/**
 * 迁移脚本：为现有的API Keys添加预览信息
 * 由于无法恢复原始密钥，将为旧密钥添加特殊标记
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const ApiKeyService = require('../src/services/apiKeyService')
const redis = require('../src/models/redis')
const logger = require('../src/utils/logger')

async function runMigration() {
  try {
    logger.info('🚀 开始迁移：为现有API Keys添加预览信息...')
    
    // 等待Redis连接
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 创建ApiKeyService实例
    const apiKeyService = new ApiKeyService()
    
    // 运行迁移
    const result = await apiKeyService.migrateAddKeyPreviews()
    
    logger.success(`✅ 迁移完成！共处理 ${result.migratedCount} 个API Keys`)
    
    process.exit(0)
  } catch (error) {
    logger.error('❌ 迁移失败:', error)
    process.exit(1)
  }
}

// 执行迁移
runMigration()
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/config/api'

export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const oemSettings = ref({
    siteName: 'Claude Relay Service',
    siteIcon: '',
    siteIconData: '',
    showAdminButton: true, // 控制管理后台按钮的显示
    updatedAt: null
  })

  const loading = ref(false)
  const saving = ref(false)

  // 移除自定义API请求方法，使用统一的apiClient

  // Actions
  const loadOemSettings = async () => {
    loading.value = true
    try {
      const result = await apiClient.get('/admin/oem-settings')

      if (result && result.success) {
        oemSettings.value = { ...oemSettings.value, ...result.data }

        // 应用设置到页面
        applyOemSettings()
      }

      return result
    } catch (error) {
      console.error('Failed to load OEM settings:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const saveOemSettings = async (settings) => {
    saving.value = true
    try {
      const result = await apiClient.put('/admin/oem-settings', settings)

      if (result && result.success) {
        oemSettings.value = { ...oemSettings.value, ...result.data }

        // 应用设置到页面
        applyOemSettings()
      }

      return result
    } catch (error) {
      console.error('Failed to save OEM settings:', error)
      throw error
    } finally {
      saving.value = false
    }
  }

  const resetOemSettings = async () => {
    const defaultSettings = {
      siteName: 'Claude Relay Service',
      siteIcon: '',
      siteIconData: '',
      showAdminButton: true,
      updatedAt: null
    }

    oemSettings.value = { ...defaultSettings }
    return await saveOemSettings(defaultSettings)
  }

  // 应用OEM设置到页面
  const applyOemSettings = () => {
    // 更新页面标题
    if (oemSettings.value.siteName) {
      document.title = `${oemSettings.value.siteName} - 管理后台`
    }

    // 更新favicon
    if (oemSettings.value.siteIconData || oemSettings.value.siteIcon) {
      const favicon = document.querySelector('link[rel="icon"]') || document.createElement('link')
      favicon.rel = 'icon'
      favicon.href = oemSettings.value.siteIconData || oemSettings.value.siteIcon
      if (!document.querySelector('link[rel="icon"]')) {
        document.head.appendChild(favicon)
      }
    }
  }

  // 格式化日期时间
  const formatDateTime = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 验证文件上传
  const validateIconFile = (file) => {
    const errors = []

    // 检查文件大小 (350KB)
    if (file.size > 350 * 1024) {
      errors.push('图标文件大小不能超过 350KB')
    }

    // 检查文件类型
    const allowedTypes = ['image/x-icon', 'image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      errors.push('不支持的文件类型，请选择 .ico, .png, .jpg 或 .svg 文件')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // 将文件转换为Base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  return {
    // State
    oemSettings,
    loading,
    saving,

    // Actions
    loadOemSettings,
    saveOemSettings,
    resetOemSettings,
    applyOemSettings,
    formatDateTime,
    validateIconFile,
    fileToBase64
  }
})

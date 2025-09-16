<template>
  <div class="accounts-container">
    <div class="card p-4 sm:p-6">
      <div class="mb-4 flex flex-col gap-4 sm:mb-6">
        <div>
          <h3 class="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100 sm:mb-2 sm:text-xl">
            账户管理
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            管理您的 Claude、Gemini、OpenAI、Azure OpenAI、OpenAI-Responses 与 CCR 账户及代理配置
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <!-- 筛选器组 -->
          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <!-- 排序选择器 -->
            <div class="group relative min-w-[160px]">
              <div
                class="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 opacity-0 blur transition duration-300 group-hover:opacity-20"
              ></div>
              <CustomDropdown
                v-model="accountSortBy"
                icon="fa-sort-amount-down"
                icon-color="text-indigo-500"
                :options="sortOptions"
                placeholder="选择排序"
                @change="sortAccounts()"
              />
            </div>

            <!-- 平台筛选器 -->
            <div class="group relative min-w-[140px]">
              <div
                class="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 blur transition duration-300 group-hover:opacity-20"
              ></div>
              <CustomDropdown
                v-model="platformFilter"
                icon="fa-server"
                icon-color="text-blue-500"
                :options="platformOptions"
                placeholder="选择平台"
                @change="filterByPlatform"
              />
            </div>

            <!-- 分组筛选器 -->
            <div class="group relative min-w-[160px]">
              <div
                class="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 blur transition duration-300 group-hover:opacity-20"
              ></div>
              <CustomDropdown
                v-model="groupFilter"
                icon="fa-layer-group"
                icon-color="text-purple-500"
                :options="groupOptions"
                placeholder="选择分组"
                @change="filterByGroup"
              />
            </div>

            <!-- 刷新按钮 -->
            <div class="relative">
              <el-tooltip
                content="刷新数据 (Ctrl/⌘+点击强制刷新所有缓存)"
                effect="dark"
                placement="bottom"
              >
                <button
                  class="group relative flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500 sm:w-auto"
                  :disabled="accountsLoading"
                  @click.ctrl.exact="loadAccounts(true)"
                  @click.exact="loadAccounts(false)"
                  @click.meta.exact="loadAccounts(true)"
                >
                  <div
                    class="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 opacity-0 blur transition duration-300 group-hover:opacity-20"
                  ></div>
                  <i
                    :class="[
                      'fas relative text-green-500',
                      accountsLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'
                    ]"
                  />
                  <span class="relative">刷新</span>
                </button>
              </el-tooltip>
            </div>
          </div>

          <!-- 添加账户按钮 -->
          <button
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all duration-200 hover:from-green-600 hover:to-green-700 hover:shadow-lg sm:w-auto"
            @click.stop="openCreateAccountModal"
          >
            <i class="fas fa-plus"></i>
            <span>添加账户</span>
          </button>
        </div>
      </div>

      <div v-if="accountsLoading" class="py-12 text-center">
        <div class="loading-spinner mx-auto mb-4" />
        <p class="text-gray-500 dark:text-gray-400">正在加载账户...</p>
      </div>

      <div v-else-if="sortedAccounts.length === 0" class="py-12 text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
        >
          <i class="fas fa-user-circle text-xl text-gray-400" />
        </div>
        <p class="text-lg text-gray-500 dark:text-gray-400">暂无账户</p>
        <p class="mt-2 text-sm text-gray-400 dark:text-gray-500">点击上方按钮添加您的第一个账户</p>
      </div>

      <!-- 桌面端表格视图 -->
      <div v-else class="table-container hidden md:block">
        <table class="w-full table-fixed">
          <thead class="bg-gray-50/80 backdrop-blur-sm dark:bg-gray-700/80">
            <tr>
              <th
                class="w-[20%] min-w-[180px] cursor-pointer px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                @click="sortAccounts('name')"
              >
                名称
                <i
                  v-if="accountsSortBy === 'name'"
                  :class="[
                    'fas',
                    accountsSortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down',
                    'ml-1'
                  ]"
                />
                <i v-else class="fas fa-sort ml-1 text-gray-400" />
              </th>
              <th
                class="w-[13%] min-w-[120px] cursor-pointer px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                @click="sortAccounts('platform')"
              >
                平台/类型
                <i
                  v-if="accountsSortBy === 'platform'"
                  :class="[
                    'fas',
                    accountsSortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down',
                    'ml-1'
                  ]"
                />
                <i v-else class="fas fa-sort ml-1 text-gray-400" />
              </th>
              <th
                class="w-[10%] min-w-[100px] cursor-pointer px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                @click="sortAccounts('status')"
              >
                状态
                <i
                  v-if="accountsSortBy === 'status'"
                  :class="[
                    'fas',
                    accountsSortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down',
                    'ml-1'
                  ]"
                />
                <i v-else class="fas fa-sort ml-1 text-gray-400" />
              </th>
              <th
                class="w-[7%] min-w-[80px] cursor-pointer px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                @click="sortAccounts('priority')"
              >
                优先级
                <i
                  v-if="accountsSortBy === 'priority'"
                  :class="[
                    'fas',
                    accountsSortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down',
                    'ml-1'
                  ]"
                />
                <i v-else class="fas fa-sort ml-1 text-gray-400" />
              </th>
              <th
                class="w-[9%] min-w-[100px] px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                代理
              </th>
              <th
                class="w-[8%] min-w-[90px] px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                今日使用
              </th>
              <th
                class="w-[11%] min-w-[100px] px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                <div class="flex items-center gap-2">
                  <span>会话窗口</span>
                  <el-tooltip placement="top">
                    <template #content>
                      <div class="space-y-2">
                        <div>会话窗口进度表示5小时窗口的时间进度</div>
                        <div class="space-y-1 text-xs">
                          <div class="flex items-center gap-2">
                            <div
                              class="h-2 w-16 rounded bg-gradient-to-r from-blue-500 to-indigo-600"
                            ></div>
                            <span>正常：请求正常处理</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <div
                              class="h-2 w-16 rounded bg-gradient-to-r from-yellow-500 to-orange-500"
                            ></div>
                            <span>警告：接近限制</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <div
                              class="h-2 w-16 rounded bg-gradient-to-r from-red-500 to-red-600"
                            ></div>
                            <span>拒绝：达到速率限制</span>
                          </div>
                        </div>
                      </div>
                    </template>
                    <i
                      class="fas fa-question-circle cursor-help text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
                    />
                  </el-tooltip>
                </div>
              </th>
              <th
                class="w-[7%] min-w-[80px] px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                最后使用
              </th>
              <th
                class="w-[15%] min-w-[180px] px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200/50 dark:divide-gray-600/50">
            <template v-for="account in sortedAccounts" :key="account.id">
              <tr class="table-row">
                <td class="px-3 py-4">
                  <div class="flex items-center">
                    <div
                      class="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600"
                    >
                      <i class="fas fa-user-circle text-xs text-white" />
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <div
                          class="truncate text-sm font-semibold text-gray-900"
                          :title="account.name"
                        >
                          {{ account.name }}
                        </div>
                        <span
                          v-if="account.accountType === 'dedicated'"
                          class="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800"
                        >
                          <i class="fas fa-lock mr-1" />专属
                        </span>
                        <span
                          v-else-if="account.accountType === 'group'"
                          class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                        >
                          <i class="fas fa-layer-group mr-1" />分组调度
                        </span>
                        <span
                          v-else
                          class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                        >
                          <i class="fas fa-share-alt mr-1" />共享
                        </span>
                      </div>
                      <!-- 显示所有分组 - 换行显示；若无多分组则回退到单分组字段 -->
                      <div
                        v-if="account.groupInfos && account.groupInfos.length > 0"
                        class="my-2 flex flex-wrap items-center gap-2"
                      >
                        <span
                          v-for="group in account.groupInfos"
                          :key="group.id"
                          class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          :title="`所属分组: ${group.name}`"
                        >
                          <i class="fas fa-folder mr-1" />{{ group.name }}
                        </span>
                      </div>
                      <span
                        v-else-if="account.groupInfo"
                        class="my-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        :title="`所属分组: ${account.groupInfo.name}`"
                      >
                        <i class="fas fa-folder mr-1" />{{ account.groupInfo.name }}
                      </span>
                      <div
                        class="truncate text-xs text-gray-500 dark:text-gray-400"
                        :title="account.id"
                      >
                        {{ account.id }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-3 py-4">
                  <div class="flex items-center gap-1">
                    <!-- 平台图标和名称 -->
                    <div
                      v-if="account.platform === 'gemini'"
                      class="flex items-center gap-1.5 rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-100 to-amber-100 px-2.5 py-1"
                    >
                      <i class="fas fa-robot text-xs text-yellow-700" />
                      <span class="text-xs font-semibold text-yellow-800">Gemini</span>
                      <span class="mx-1 h-4 w-px bg-yellow-300" />
                      <span class="text-xs font-medium text-yellow-700">
                        {{ getGeminiAuthType() }}
                      </span>
                    </div>
                    <div
                      v-else-if="account.platform === 'claude-console'"
                      class="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-100 to-pink-100 px-2.5 py-1"
                    >
                      <i class="fas fa-terminal text-xs text-purple-700" />
                      <span class="text-xs font-semibold text-purple-800">Console</span>
                      <span class="mx-1 h-4 w-px bg-purple-300" />
                      <span class="text-xs font-medium text-purple-700">API Key</span>
                    </div>
                    <div
                      v-else-if="account.platform === 'bedrock'"
                      class="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-gradient-to-r from-orange-100 to-red-100 px-2.5 py-1"
                    >
                      <i class="fab fa-aws text-xs text-orange-700" />
                      <span class="text-xs font-semibold text-orange-800">Bedrock</span>
                      <span class="mx-1 h-4 w-px bg-orange-300" />
                      <span class="text-xs font-medium text-orange-700">AWS</span>
                    </div>
                    <div
                      v-else-if="account.platform === 'openai'"
                      class="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-100 bg-gradient-to-r from-gray-100 to-gray-100 px-2.5 py-1"
                    >
                      <div class="fa-openai" />
                      <span class="text-xs font-semibold text-gray-950">OpenAi</span>
                      <span class="mx-1 h-4 w-px bg-gray-400" />
                      <span class="text-xs font-medium text-gray-950">{{
                        getOpenAIAuthType()
                      }}</span>
                    </div>
                    <div
                      v-else-if="account.platform === 'azure_openai'"
                      class="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-100 to-cyan-100 px-2.5 py-1 dark:border-blue-700 dark:from-blue-900/20 dark:to-cyan-900/20"
                    >
                      <i class="fab fa-microsoft text-xs text-blue-700 dark:text-blue-400" />
                      <span class="text-xs font-semibold text-blue-800 dark:text-blue-300"
                        >Azure OpenAI</span
                      >
                      <span class="mx-1 h-4 w-px bg-blue-300 dark:bg-blue-600" />
                      <span class="text-xs font-medium text-blue-700 dark:text-blue-400"
                        >API Key</span
                      >
                    </div>
                    <div
                      v-else-if="account.platform === 'openai-responses'"
                      class="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-gradient-to-r from-teal-100 to-green-100 px-2.5 py-1 dark:border-teal-700 dark:from-teal-900/20 dark:to-green-900/20"
                    >
                      <i class="fas fa-server text-xs text-teal-700 dark:text-teal-400" />
                      <span class="text-xs font-semibold text-teal-800 dark:text-teal-300"
                        >OpenAI-Responses</span
                      >
                      <span class="mx-1 h-4 w-px bg-teal-300 dark:bg-teal-600" />
                      <span class="text-xs font-medium text-teal-700 dark:text-teal-400"
                        >API Key</span
                      >
                    </div>
                    <div
                      v-else-if="
                        account.platform === 'claude' || account.platform === 'claude-oauth'
                      "
                      class="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-100 to-blue-100 px-2.5 py-1"
                    >
                      <i class="fas fa-brain text-xs text-indigo-700" />
                      <span class="text-xs font-semibold text-indigo-800">{{
                        getClaudeAccountType(account)
                      }}</span>
                      <span class="mx-1 h-4 w-px bg-indigo-300" />
                      <span class="text-xs font-medium text-indigo-700">
                        {{ getClaudeAuthType(account) }}
                      </span>
                    </div>
                    <div
                      v-else-if="account.platform === 'ccr'"
                      class="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-gradient-to-r from-teal-100 to-emerald-100 px-2.5 py-1 dark:border-teal-700 dark:from-teal-900/20 dark:to-emerald-900/20"
                    >
                      <i class="fas fa-code-branch text-xs text-teal-700 dark:text-teal-400" />
                      <span class="text-xs font-semibold text-teal-800 dark:text-teal-300"
                        >CCR</span
                      >
                      <span class="mx-1 h-4 w-px bg-teal-300 dark:bg-teal-600" />
                      <span class="text-xs font-medium text-teal-700 dark:text-teal-300"
                        >Relay</span
                      >
                    </div>
                    <div
                      v-else
                      class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gradient-to-r from-gray-100 to-gray-200 px-2.5 py-1"
                    >
                      <i class="fas fa-question text-xs text-gray-700" />
                      <span class="text-xs font-semibold text-gray-800">未知</span>
                    </div>
                  </div>
                </td>
                <td class="whitespace-nowrap px-3 py-4">
                  <div class="flex flex-col gap-1">
                    <span
                      :class="[
                        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                        account.status === 'blocked'
                          ? 'bg-orange-100 text-orange-800'
                          : account.status === 'unauthorized'
                            ? 'bg-red-100 text-red-800'
                            : account.status === 'temp_error'
                              ? 'bg-orange-100 text-orange-800'
                              : account.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                      ]"
                    >
                      <div
                        :class="[
                          'mr-2 h-2 w-2 rounded-full',
                          account.status === 'blocked'
                            ? 'bg-orange-500'
                            : account.status === 'unauthorized'
                              ? 'bg-red-500'
                              : account.status === 'temp_error'
                                ? 'bg-orange-500'
                                : account.isActive
                                  ? 'bg-green-500'
                                  : 'bg-red-500'
                        ]"
                      />
                      {{
                        account.status === 'blocked'
                          ? '已封锁'
                          : account.status === 'unauthorized'
                            ? '异常'
                            : account.status === 'temp_error'
                              ? '临时异常'
                              : account.isActive
                                ? '正常'
                                : '异常'
                      }}
                    </span>
                    <span
                      v-if="
                        (account.rateLimitStatus && account.rateLimitStatus.isRateLimited) ||
                        account.rateLimitStatus === 'limited'
                      "
                      class="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800"
                    >
                      <i class="fas fa-exclamation-triangle mr-1" />
                      限流中
                      <span
                        v-if="
                          account.rateLimitStatus &&
                          typeof account.rateLimitStatus === 'object' &&
                          account.rateLimitStatus.minutesRemaining > 0
                        "
                        >({{ formatRateLimitTime(account.rateLimitStatus.minutesRemaining) }})</span
                      >
                    </span>
                    <span
                      v-if="account.schedulable === false"
                      class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
                    >
                      <i class="fas fa-pause-circle mr-1" />
                      不可调度
                      <el-tooltip
                        v-if="getSchedulableReason(account)"
                        :content="getSchedulableReason(account)"
                        effect="dark"
                        placement="top"
                      >
                        <i class="fas fa-question-circle ml-1 cursor-help text-gray-500" />
                      </el-tooltip>
                    </span>
                    <span
                      v-if="account.status === 'blocked' && account.errorMessage"
                      class="mt-1 max-w-xs truncate text-xs text-gray-500 dark:text-gray-400"
                      :title="account.errorMessage"
                    >
                      {{ account.errorMessage }}
                    </span>
                    <span
                      v-if="account.accountType === 'dedicated'"
                      class="text-xs text-gray-500 dark:text-gray-400"
                    >
                      绑定: {{ account.boundApiKeysCount || 0 }} 个API Key
                    </span>
                  </div>
                </td>
                <td class="whitespace-nowrap px-3 py-4">
                  <div
                    v-if="
                      account.platform === 'claude' ||
                      account.platform === 'claude-console' ||
                      account.platform === 'bedrock' ||
                      account.platform === 'gemini' ||
                      account.platform === 'openai' ||
                      account.platform === 'openai-responses' ||
                      account.platform === 'azure_openai' ||
                      account.platform === 'ccr'
                    "
                    class="flex items-center gap-2"
                  >
                    <div class="h-2 w-16 rounded-full bg-gray-200">
                      <div
                        class="h-2 rounded-full bg-gradient-to-r from-green-500 to-blue-600 transition-all duration-300"
                        :style="{ width: 101 - (account.priority || 50) + '%' }"
                      />
                    </div>
                    <span class="min-w-[20px] text-xs font-medium text-gray-700 dark:text-gray-200">
                      {{ account.priority || 50 }}
                    </span>
                  </div>
                  <div v-else class="text-sm text-gray-400">
                    <span class="text-xs">N/A</span>
                  </div>
                </td>
                <td class="px-3 py-4 text-sm text-gray-600">
                  <div
                    v-if="formatProxyDisplay(account.proxy)"
                    class="break-all rounded bg-blue-50 px-2 py-1 font-mono text-xs"
                    :title="formatProxyDisplay(account.proxy)"
                  >
                    {{ formatProxyDisplay(account.proxy) }}
                  </div>
                  <div v-else class="text-gray-400">无代理</div>
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm">
                  <div v-if="account.usage && account.usage.daily" class="space-y-1">
                    <div class="flex items-center gap-2">
                      <div class="h-2 w-2 rounded-full bg-blue-500" />
                      <span class="text-sm font-medium text-gray-900 dark:text-gray-100"
                        >{{ account.usage.daily.requests || 0 }} 次</span
                      >
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="h-2 w-2 rounded-full bg-purple-500" />
                      <span class="text-xs text-gray-600 dark:text-gray-300">{{
                        formatTokenCount(account.usage.daily.allTokens || 0)
                      }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="h-2 w-2 rounded-full bg-green-500" />
                      <span class="text-xs text-gray-600 dark:text-gray-300"
                        >${{ calculateDailyCost(account) }}</span
                      >
                    </div>
                    <div
                      v-if="account.usage.averages && account.usage.averages.rpm > 0"
                      class="text-xs text-gray-500 dark:text-gray-400"
                    >
                      平均 {{ account.usage.averages.rpm.toFixed(2) }} RPM
                    </div>
                  </div>
                  <div v-else class="text-xs text-gray-400">暂无数据</div>
                </td>
                <!-- 会话窗口列 -->
                <td class="whitespace-nowrap px-3 py-4">
                  <div
                    v-if="
                      (account.platform === 'claude' || account.platform === 'openai') &&
                      account.sessionWindow &&
                      account.sessionWindow.hasActiveWindow
                    "
                    class="space-y-2"
                  >
                    <!-- 使用统计在顶部 -->
                    <div
                      v-if="account.usage && account.usage.sessionWindow"
                      class="flex items-center gap-3 text-xs"
                    >
                      <div class="flex items-center gap-1">
                        <div class="h-1.5 w-1.5 rounded-full bg-purple-500" />
                        <span class="font-medium text-gray-900 dark:text-gray-100">
                          {{ formatTokenCount(account.usage.sessionWindow.totalTokens || 0) }}
                        </span>
                      </div>
                      <div class="flex items-center gap-1">
                        <div class="h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span class="font-medium text-gray-900 dark:text-gray-100">
                          ${{ formatCost(account.usage.sessionWindow.totalCost) }}
                        </span>
                      </div>
                    </div>

                    <!-- 进度条 -->
                    <div class="flex items-center gap-2">
                      <div class="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          :class="[
                            'h-2 rounded-full transition-all duration-300',
                            getSessionProgressBarClass(account.sessionWindow.sessionWindowStatus)
                          ]"
                          :style="{ width: account.sessionWindow.progress + '%' }"
                        />
                      </div>
                      <span
                        class="min-w-[32px] text-xs font-medium text-gray-700 dark:text-gray-200"
                      >
                        {{ account.sessionWindow.progress }}%
                      </span>
                    </div>

                    <!-- 时间信息 -->
                    <div class="text-xs text-gray-600 dark:text-gray-400">
                      <div>
                        {{
                          formatSessionWindow(
                            account.sessionWindow.windowStart,
                            account.sessionWindow.windowEnd
                          )
                        }}
                      </div>
                      <div
                        v-if="account.sessionWindow.remainingTime > 0"
                        class="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400"
                      >
                        <i class="fas fa-hourglass-half text-xs" />
                        <span
                          >剩余 {{ formatRemainingTime(account.sessionWindow.remainingTime) }}</span
                        >
                      </div>
                      <div v-else class="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <i class="fas fa-hourglass-end text-xs" />
                        <span>已结束</span>
                      </div>

                      <!-- 模型分布按钮 -->
                      <div
                        v-if="
                          account.sessionWindow.windowUsage &&
                          account.sessionWindow.windowUsage.modelDistribution
                        "
                        class="mt-2"
                      >
                        <button
                          class="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                          @click.stop="toggleAccountModelStats(account.id)"
                        >
                          <i
                            :class="[
                              'fas text-xs',
                              expandedAccountModelStats.has(account.id)
                                ? 'fa-chevron-up'
                                : 'fa-chevron-down'
                            ]"
                          />
                          <span>模型</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Claude Console: 显示每日额度使用进度 -->
                  <div v-else-if="account.platform === 'claude-console'" class="space-y-2">
                    <div v-if="Number(account.dailyQuota) > 0">
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-gray-600 dark:text-gray-300">额度进度</span>
                        <span class="font-medium text-gray-700 dark:text-gray-200">
                          {{ getQuotaUsagePercent(account).toFixed(1) }}%
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            :class="[
                              'h-2 rounded-full transition-all duration-300',
                              getQuotaBarClass(getQuotaUsagePercent(account))
                            ]"
                            :style="{
                              width: Math.min(100, getQuotaUsagePercent(account)) + '%'
                            }"
                          />
                        </div>
                        <span
                          class="min-w-[32px] text-xs font-medium text-gray-700 dark:text-gray-200"
                        >
                          ${{ formatCost(account.usage?.daily?.cost || 0) }} / ${{
                            Number(account.dailyQuota).toFixed(2)
                          }}
                        </span>
                      </div>
                      <div class="text-xs text-gray-600 dark:text-gray-400">
                        剩余 ${{ formatRemainingQuota(account) }}
                        <span class="ml-2 text-gray-400"
                          >重置 {{ account.quotaResetTime || '00:00' }}</span
                        >
                      </div>
                    </div>
                    <div v-else class="text-sm text-gray-400">
                      <i class="fas fa-minus" />
                    </div>
                  </div>
                  <div v-else class="text-sm text-gray-400">
                    <span class="text-xs">N/A</span>
                  </div>
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {{ formatLastUsed(account.lastUsedAt) }}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm font-medium">
                  <div class="flex flex-wrap items-center gap-1">
                    <button
                      v-if="
                        (account.platform === 'claude' ||
                          account.platform === 'claude-console' ||
                          account.platform === 'openai') &&
                        (account.status === 'unauthorized' ||
                          account.status !== 'active' ||
                          account.rateLimitStatus?.isRateLimited ||
                          account.rateLimitStatus === 'limited' ||
                          !account.isActive)
                      "
                      :class="[
                        'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                        account.isResetting
                          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      ]"
                      :disabled="account.isResetting"
                      :title="account.isResetting ? '重置中...' : '重置所有异常状态'"
                      @click="resetAccountStatus(account)"
                    >
                      <i :class="['fas fa-redo', account.isResetting ? 'animate-spin' : '']" />
                      <span class="ml-1">重置状态</span>
                    </button>
                    <button
                      :class="[
                        'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                        account.isTogglingSchedulable
                          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                          : account.schedulable
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      ]"
                      :disabled="account.isTogglingSchedulable"
                      :title="account.schedulable ? '点击禁用调度' : '点击启用调度'"
                      @click="toggleSchedulable(account)"
                    >
                      <i :class="['fas', account.schedulable ? 'fa-toggle-on' : 'fa-toggle-off']" />
                      <span class="ml-1">{{ account.schedulable ? '调度' : '停用' }}</span>
                    </button>
                    <button
                      class="rounded bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200"
                      :title="'编辑账户'"
                      @click="editAccount(account)"
                    >
                      <i class="fas fa-edit" />
                      <span class="ml-1">编辑</span>
                    </button>
                    <button
                      class="rounded bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200"
                      :title="'删除账户'"
                      @click="deleteAccount(account)"
                    >
                      <i class="fas fa-trash" />
                      <span class="ml-1">删除</span>
                    </button>
                  </div>
                </td>
              </tr>
              <!-- 展开的模型使用统计行 -->
              <tr v-if="expandedAccountModelStats.has(account.id)">
                <td class="bg-gray-50 px-4 py-6 dark:bg-gray-700" colspan="9">
                  <div class="mx-4 rounded-lg bg-white p-6 shadow-inner dark:bg-gray-800">
                    <!-- 标题栏 -->
                    <div class="mb-4 flex items-center justify-between">
                      <h5
                        class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-200"
                      >
                        <i class="fas fa-chart-pie mr-2 text-indigo-500" />
                        会话窗口模型使用分布（5小时）
                      </h5>
                      <div class="flex items-center gap-2">
                        <span
                          v-if="
                            accountModelStats[account.id] &&
                            accountModelStats[account.id].length > 0
                          "
                          class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        >
                          {{ accountModelStats[account.id].length }} 个模型
                        </span>
                        <button
                          class="ml-2 flex items-center gap-1 text-sm text-blue-500 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title="刷新数据"
                          @click="loadAccountModelStats(account.id, true)"
                        >
                          <i
                            :class="[
                              'fas fa-sync-alt text-xs',
                              accountModelStatsLoading[account.id] ? 'fa-spin' : ''
                            ]"
                          />
                          <span class="text-xs">刷新</span>
                        </button>
                      </div>
                    </div>

                    <!-- 数据展示区域 -->
                    <div v-if="accountModelStatsLoading[account.id]" class="py-8 text-center">
                      <i
                        class="fas fa-spinner fa-spin mb-3 text-2xl text-gray-400 dark:text-gray-500"
                      />
                      <p class="text-sm text-gray-500 dark:text-gray-400">正在加载模型统计...</p>
                    </div>
                    <div
                      v-else-if="
                        !accountModelStats[account.id] || accountModelStats[account.id].length === 0
                      "
                      class="py-8 text-center"
                    >
                      <div class="mb-3 flex items-center justify-center gap-2">
                        <i class="fas fa-chart-line text-lg text-gray-400 dark:text-gray-500" />
                        <p class="text-sm text-gray-500 dark:text-gray-400">暂无模型使用数据</p>
                      </div>
                      <p class="text-xs text-gray-400 dark:text-gray-500">
                        当前会话窗口内没有使用记录
                      </p>
                    </div>
                    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div
                        v-for="stat in accountModelStats[account.id]"
                        :key="stat.model"
                        class="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 transition-all duration-200 hover:border-indigo-300 hover:shadow-lg dark:border-gray-600 dark:from-gray-800 dark:to-gray-700 dark:hover:border-indigo-500"
                      >
                        <div class="mb-3 flex items-start justify-between">
                          <div class="flex-1">
                            <span
                              class="mb-1 block text-sm font-semibold text-gray-800 dark:text-gray-100"
                              >{{ stat.model }}</span
                            >
                            <span
                              class="rounded-full bg-blue-50 px-2 py-1 text-xs text-gray-500 dark:bg-blue-900/30 dark:text-gray-400"
                              >{{ stat.requests }} 次请求</span
                            >
                          </div>
                        </div>

                        <div class="mb-3 space-y-2">
                          <div class="flex items-center justify-between text-sm">
                            <span class="flex items-center text-gray-600 dark:text-gray-300">
                              <i class="fas fa-coins mr-1 text-xs text-yellow-500" />
                              总Token:
                            </span>
                            <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                              formatTokenCount(stat.allTokens)
                            }}</span>
                          </div>
                          <div class="flex items-center justify-between text-sm">
                            <span class="flex items-center text-gray-600 dark:text-gray-300">
                              <i class="fas fa-dollar-sign mr-1 text-xs text-green-500" />
                              费用:
                            </span>
                            <span class="font-semibold text-green-600 dark:text-green-400">{{
                              calculateModelCost(stat)
                            }}</span>
                          </div>
                          <div class="mt-2 border-t border-gray-100 pt-2 dark:border-gray-600">
                            <div
                              class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
                            >
                              <span class="flex items-center">
                                <i class="fas fa-arrow-down mr-1 text-green-500" />
                                输入:
                              </span>
                              <span class="font-medium">{{
                                formatTokenCount(stat.inputTokens)
                              }}</span>
                            </div>
                            <div
                              class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
                            >
                              <span class="flex items-center">
                                <i class="fas fa-arrow-up mr-1 text-blue-500" />
                                输出:
                              </span>
                              <span class="font-medium">{{
                                formatTokenCount(stat.outputTokens)
                              }}</span>
                            </div>
                            <div
                              v-if="stat.cacheCreateTokens > 0"
                              class="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400"
                            >
                              <span class="flex items-center">
                                <i class="fas fa-save mr-1" />
                                缓存创建:
                              </span>
                              <span class="font-medium">{{
                                formatTokenCount(stat.cacheCreateTokens)
                              }}</span>
                            </div>
                            <div
                              v-if="stat.cacheReadTokens > 0"
                              class="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400"
                            >
                              <span class="flex items-center">
                                <i class="fas fa-download mr-1" />
                                缓存读取:
                              </span>
                              <span class="font-medium">{{
                                formatTokenCount(stat.cacheReadTokens)
                              }}</span>
                            </div>
                          </div>
                        </div>

                        <!-- 进度条 -->
                        <div class="mt-3 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            class="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                            :style="{
                              width:
                                calculateAccountModelPercentage(
                                  stat.allTokens,
                                  accountModelStats[account.id]
                                ) + '%'
                            }"
                          />
                        </div>
                        <div class="mt-1 text-right">
                          <span class="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            {{
                              calculateAccountModelPercentage(
                                stat.allTokens,
                                accountModelStats[account.id]
                              )
                            }}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- 总计统计，仅在有数据时显示 -->
                    <div
                      v-if="
                        accountModelStats[account.id] && accountModelStats[account.id].length > 0
                      "
                      class="mt-4 rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-3 dark:border-indigo-700 dark:from-indigo-900/20 dark:to-purple-900/20"
                    >
                      <div class="flex items-center justify-between text-sm">
                        <span
                          class="flex items-center font-semibold text-gray-700 dark:text-gray-300"
                        >
                          <i class="fas fa-calculator mr-2 text-indigo-500" />
                          总计统计
                        </span>
                        <div class="flex gap-4 text-xs">
                          <span class="text-gray-600 dark:text-gray-400">
                            总请求:
                            <span class="font-semibold text-gray-800 dark:text-gray-200">{{
                              accountModelStats[account.id].reduce(
                                (sum, stat) => sum + stat.requests,
                                0
                              )
                            }}</span>
                          </span>
                          <span class="text-gray-600 dark:text-gray-400">
                            总Token:
                            <span class="font-semibold text-gray-800 dark:text-gray-200">{{
                              formatTokenCount(
                                accountModelStats[account.id].reduce(
                                  (sum, stat) => sum + stat.allTokens,
                                  0
                                )
                              )
                            }}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- 移动端卡片视图 -->
      <div v-if="!accountsLoading && sortedAccounts.length > 0" class="space-y-3 md:hidden">
        <div
          v-for="account in sortedAccounts"
          :key="account.id"
          class="card p-4 transition-shadow hover:shadow-lg"
        >
          <!-- 卡片头部 -->
          <div class="mb-3 flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                  account.platform === 'claude'
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                    : account.platform === 'bedrock'
                      ? 'bg-gradient-to-br from-orange-500 to-red-600'
                      : account.platform === 'azure_openai'
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-600'
                        : account.platform === 'openai'
                          ? 'bg-gradient-to-br from-gray-600 to-gray-700'
                          : account.platform === 'ccr'
                            ? 'bg-gradient-to-br from-teal-500 to-emerald-600'
                            : 'bg-gradient-to-br from-blue-500 to-blue-600'
                ]"
              >
                <i
                  :class="[
                    'text-sm text-white',
                    account.platform === 'claude'
                      ? 'fas fa-brain'
                      : account.platform === 'bedrock'
                        ? 'fab fa-aws'
                        : account.platform === 'azure_openai'
                          ? 'fab fa-microsoft'
                          : account.platform === 'openai'
                            ? 'fas fa-openai'
                            : account.platform === 'ccr'
                              ? 'fas fa-code-branch'
                              : 'fas fa-robot'
                  ]"
                />
              </div>
              <div>
                <h4 class="text-sm font-semibold text-gray-900">
                  {{ account.name || account.email }}
                </h4>
                <div class="mt-0.5 flex items-center gap-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{
                    account.platform
                  }}</span>
                  <span class="text-xs text-gray-400">|</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{ account.type }}</span>
                </div>
              </div>
            </div>
            <span
              :class="[
                'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold',
                getAccountStatusClass(account)
              ]"
            >
              <div
                :class="['mr-1.5 h-1.5 w-1.5 rounded-full', getAccountStatusDotClass(account)]"
              />
              {{ getAccountStatusText(account) }}
            </span>
          </div>

          <!-- 使用统计 -->
          <div class="mb-3 grid grid-cols-2 gap-3">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">今日使用</p>
              <div class="space-y-1">
                <div class="flex items-center gap-1.5">
                  <div class="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {{ account.usage?.daily?.requests || 0 }} 次
                  </p>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  <p class="text-xs text-gray-600 dark:text-gray-400">
                    {{ formatTokenCount(account.usage?.daily?.allTokens || 0) }}
                  </p>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <p class="text-xs text-gray-600 dark:text-gray-400">
                    ${{ calculateDailyCost(account) }}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">会话窗口</p>
              <div v-if="account.usage && account.usage.sessionWindow" class="space-y-1">
                <div class="flex items-center gap-1.5">
                  <div class="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {{ formatTokenCount(account.usage.sessionWindow.totalTokens || 0) }}
                  </p>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <p class="text-xs text-gray-600 dark:text-gray-400">
                    ${{ formatCost(account.usage.sessionWindow.totalCost) }}
                  </p>
                </div>
              </div>
              <div v-else class="text-sm font-semibold text-gray-400">-</div>
            </div>
          </div>

          <!-- 状态信息 -->
          <div class="mb-3 space-y-2">
            <!-- 会话窗口 -->
            <div
              v-if="
                (account.platform === 'claude' || account.platform === 'openai') &&
                account.sessionWindow &&
                account.sessionWindow.hasActiveWindow
              "
              class="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
            >
              <!-- 标题和进度 -->
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-1">
                  <span class="font-medium text-gray-600 dark:text-gray-300">会话窗口</span>
                  <el-tooltip
                    content="会话窗口进度不代表使用量，仅表示距离下一个5小时窗口的剩余时间"
                    placement="top"
                  >
                    <i
                      class="fas fa-question-circle cursor-help text-xs text-gray-400 hover:text-gray-600"
                    />
                  </el-tooltip>
                </div>
                <span class="font-medium text-gray-700 dark:text-gray-200">
                  {{ account.sessionWindow.progress }}%
                </span>
              </div>

              <!-- 进度条 -->
              <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                <div
                  :class="[
                    'h-full transition-all duration-300',
                    getSessionProgressBarClass(account.sessionWindow.sessionWindowStatus, account)
                  ]"
                  :style="{ width: account.sessionWindow.progress + '%' }"
                />
              </div>

              <!-- 详细信息 -->
              <div class="space-y-1.5 text-xs">
                <!-- 时间窗口 -->
                <div class="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <i class="fas fa-clock text-xs text-blue-500" />
                  <span>
                    {{
                      formatSessionWindow(
                        account.sessionWindow.windowStart,
                        account.sessionWindow.windowEnd
                      )
                    }}
                  </span>
                </div>

                <!-- 剩余时间 -->
                <div
                  v-if="account.sessionWindow.remainingTime > 0"
                  class="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400"
                >
                  <i class="fas fa-hourglass-half text-xs" />
                  <span>剩余 {{ formatRemainingTime(account.sessionWindow.remainingTime) }}</span>
                </div>
                <div v-else class="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <i class="fas fa-hourglass-end text-xs" />
                  <span>已结束</span>
                </div>

                <!-- RPM 指示器 -->
                <div
                  v-if="account.usage && account.usage.averages && account.usage.averages.rpm > 0"
                  class="flex items-center gap-1 text-green-600 dark:text-green-400"
                >
                  <i class="fas fa-tachometer-alt text-xs" />
                  <span>{{ account.usage.averages.rpm.toFixed(2) }} RPM</span>
                </div>

                <!-- 已用tokens -->
                <div
                  v-if="account.sessionWindow.windowUsage"
                  class="font-medium text-blue-600 dark:text-blue-400"
                >
                  已用:
                  {{ formatTokenCount(account.sessionWindow.windowUsage.totalTokens || 0) }}
                  <span
                    v-if="account.sessionWindow.windowUsage.requests > 0"
                    class="text-gray-500 dark:text-gray-400"
                  >
                    ({{ account.sessionWindow.windowUsage.requests }} 次)
                  </span>
                </div>

                <!-- 模型分布按钮 -->
                <div class="mt-2 border-t border-gray-200 pt-2 dark:border-gray-600">
                  <button
                    v-if="
                      account.sessionWindow.windowUsage &&
                      account.sessionWindow.windowUsage.modelDistribution
                    "
                    class="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                    @click.stop="toggleAccountModelStats(account.id)"
                  >
                    <i
                      :class="[
                        'fas',
                        expandedAccountModelStats.has(account.id)
                          ? 'fa-chevron-up'
                          : 'fa-chevron-down'
                      ]"
                    />
                    <span>模型</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 最后使用时间 -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-500 dark:text-gray-400">最后使用</span>
              <span class="text-gray-700 dark:text-gray-200">
                {{ account.lastUsedAt ? formatRelativeTime(account.lastUsedAt) : '从未使用' }}
              </span>
            </div>

            <!-- 代理配置 -->
            <div
              v-if="account.proxyConfig && account.proxyConfig.type !== 'none'"
              class="flex items-center justify-between text-xs"
            >
              <span class="text-gray-500 dark:text-gray-400">代理</span>
              <span class="text-gray-700 dark:text-gray-200">
                {{ account.proxyConfig.type.toUpperCase() }}
              </span>
            </div>

            <!-- 调度优先级 -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-500 dark:text-gray-400">优先级</span>
              <span class="font-medium text-gray-700 dark:text-gray-200">
                {{ account.priority || 50 }}
              </span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="mt-3 flex gap-2 border-t border-gray-100 pt-3">
            <button
              class="flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors"
              :class="
                account.schedulable
                  ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              "
              :disabled="account.isTogglingSchedulable"
              @click="toggleSchedulable(account)"
            >
              <i :class="['fas', account.schedulable ? 'fa-pause' : 'fa-play']" />
              {{ account.schedulable ? '暂停' : '启用' }}
            </button>

            <button
              class="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-100"
              @click="editAccount(account)"
            >
              <i class="fas fa-edit mr-1" />
              编辑
            </button>

            <button
              class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 transition-colors hover:bg-red-100"
              @click="deleteAccount(account)"
            >
              <i class="fas fa-trash" />
            </button>
          </div>

          <!-- 展开的模型使用统计（移动端） -->
          <div
            v-if="expandedAccountModelStats.has(account.id)"
            class="mt-4 border-t border-gray-200 pt-4"
          >
            <div class="mb-3 flex items-center justify-between">
              <h5 class="text-sm font-semibold text-gray-700">
                <i class="fas fa-chart-pie mr-1 text-indigo-500" />
                会话窗口模型分布
              </h5>
              <button
                class="flex items-center gap-1 text-xs text-blue-500"
                @click="loadAccountModelStats(account.id, true)"
              >
                <i
                  :class="[
                    'fas fa-sync-alt',
                    accountModelStatsLoading[account.id] ? 'fa-spin' : ''
                  ]"
                />
                刷新
              </button>
            </div>

            <div v-if="accountModelStatsLoading[account.id]" class="py-6 text-center">
              <i class="fas fa-spinner fa-spin text-xl text-gray-400" />
              <p class="mt-2 text-xs text-gray-500">加载中...</p>
            </div>
            <div
              v-else-if="
                !accountModelStats[account.id] || accountModelStats[account.id].length === 0
              "
              class="py-6 text-center"
            >
              <i class="fas fa-chart-line text-lg text-gray-400" />
              <p class="mt-2 text-xs text-gray-500">暂无数据</p>
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="stat in accountModelStats[account.id]"
                :key="stat.model"
                class="rounded-lg border border-gray-200 bg-white p-3"
              >
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-xs font-semibold text-gray-800">{{ stat.model }}</span>
                  <span class="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-gray-500">
                    {{ stat.requests }} 次
                  </span>
                </div>

                <div class="space-y-1.5 text-xs">
                  <div class="flex justify-between">
                    <span class="text-gray-600">总Token:</span>
                    <span class="font-medium text-gray-900">{{
                      formatTokenCount(stat.allTokens)
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">费用:</span>
                    <span class="font-medium text-green-600">{{ calculateModelCost(stat) }}</span>
                  </div>
                </div>

                <div class="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                  <div
                    class="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
                    :style="{
                      width:
                        calculateAccountModelPercentage(
                          stat.allTokens,
                          accountModelStats[account.id]
                        ) + '%'
                    }"
                  />
                </div>
                <div class="mt-1 text-right">
                  <span class="text-xs text-indigo-600">
                    {{
                      calculateAccountModelPercentage(
                        stat.allTokens,
                        accountModelStats[account.id]
                      )
                    }}%
                  </span>
                </div>
              </div>

              <!-- 总计 -->
              <div
                v-if="accountModelStats[account.id].length > 0"
                class="rounded-lg bg-gray-50 p-2.5 text-xs"
              >
                <div class="flex justify-between">
                  <span class="text-gray-600">总计:</span>
                  <div class="space-x-3">
                    <span>
                      {{
                        accountModelStats[account.id].reduce((sum, stat) => sum + stat.requests, 0)
                      }}
                      次
                    </span>
                    <span class="font-medium">
                      {{
                        formatTokenCount(
                          accountModelStats[account.id].reduce(
                            (sum, stat) => sum + stat.allTokens,
                            0
                          )
                        )
                      }}
                      tokens
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加账户模态框 -->
    <AccountForm
      v-if="showCreateAccountModal && (!newAccountPlatform || newAccountPlatform !== 'ccr')"
      @close="closeCreateAccountModal"
      @platform-changed="newAccountPlatform = $event"
      @success="handleCreateSuccess"
    />
    <CcrAccountForm
      v-else-if="showCreateAccountModal && newAccountPlatform === 'ccr'"
      @close="closeCreateAccountModal"
      @success="handleCreateSuccess"
    />

    <!-- 编辑账户模态框 -->
    <CcrAccountForm
      v-if="showEditAccountModal && editingAccount && editingAccount.platform === 'ccr'"
      :account="editingAccount"
      @close="showEditAccountModal = false"
      @success="handleEditSuccess"
    />
    <AccountForm
      v-else-if="showEditAccountModal"
      :account="editingAccount"
      @close="showEditAccountModal = false"
      @success="handleEditSuccess"
    />

    <!-- 确认弹窗 -->
    <ConfirmModal
      :cancel-text="confirmOptions.cancelText"
      :confirm-text="confirmOptions.confirmText"
      :message="confirmOptions.message"
      :show="showConfirmModal"
      :title="confirmOptions.title"
      @cancel="handleCancel"
      @confirm="handleConfirm"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { showToast } from '@/utils/toast'
import { apiClient } from '@/config/api'
import { useConfirm } from '@/composables/useConfirm'
import AccountForm from '@/components/accounts/AccountForm.vue'
import CcrAccountForm from '@/components/accounts/CcrAccountForm.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import CustomDropdown from '@/components/common/CustomDropdown.vue'

// 使用确认弹窗
const { showConfirmModal, confirmOptions, showConfirm, handleConfirm, handleCancel } = useConfirm()

// 数据状态
const accounts = ref([])
const accountsLoading = ref(false)
const accountSortBy = ref('name')
const accountsSortBy = ref('')
const accountsSortOrder = ref('asc')
const apiKeys = ref([])
const accountGroups = ref([])
const groupFilter = ref('all')
const platformFilter = ref('all')

// 缓存状态标志
const apiKeysLoaded = ref(false)
const groupsLoaded = ref(false)
const groupMembersLoaded = ref(false)
const accountGroupMap = ref(new Map()) // Map<accountId, Array<groupInfo>>

// 下拉选项数据
const sortOptions = ref([
  { value: 'name', label: '按名称排序', icon: 'fa-font' },
  { value: 'dailyTokens', label: '按今日Token排序', icon: 'fa-coins' },
  { value: 'dailyRequests', label: '按今日请求数排序', icon: 'fa-chart-line' },
  { value: 'totalTokens', label: '按总Token排序', icon: 'fa-database' },
  { value: 'lastUsed', label: '按最后使用排序', icon: 'fa-clock' }
])

const platformOptions = ref([
  { value: 'all', label: '所有平台', icon: 'fa-globe' },
  { value: 'claude', label: 'Claude', icon: 'fa-brain' },
  { value: 'claude-console', label: 'Claude Console', icon: 'fa-terminal' },
  { value: 'gemini', label: 'Gemini', icon: 'fa-google' },
  { value: 'openai', label: 'OpenAi', icon: 'fa-openai' },
  { value: 'azure_openai', label: 'Azure OpenAI', icon: 'fab fa-microsoft' },
  { value: 'bedrock', label: 'Bedrock', icon: 'fab fa-aws' },
  { value: 'openai-responses', label: 'OpenAI-Responses', icon: 'fa-server' },
  { value: 'ccr', label: 'CCR', icon: 'fa-code-branch' }
])

const groupOptions = computed(() => {
  const options = [
    { value: 'all', label: '所有账户', icon: 'fa-globe' },
    { value: 'ungrouped', label: '未分组账户', icon: 'fa-user' }
  ]
  accountGroups.value.forEach((group) => {
    options.push({
      value: group.id,
      label: `${group.name} (${group.platform === 'claude' ? 'Claude' : group.platform === 'gemini' ? 'Gemini' : 'OpenAI'})`,
      icon:
        group.platform === 'claude'
          ? 'fa-brain'
          : group.platform === 'gemini'
            ? 'fa-robot'
            : 'fa-openai'
    })
  })
  return options
})

// 模态框状态
const showCreateAccountModal = ref(false)
const newAccountPlatform = ref(null) // 跟踪新建账户选择的平台
const showEditAccountModal = ref(false)
const editingAccount = ref(null)

// 模型使用统计状态
const expandedAccountModelStats = ref(new Set())
const accountModelStats = ref({})
const accountModelStatsLoading = ref({})
const accountModelStatsLoaded = ref({})

// 计算排序后的账户列表
const sortedAccounts = computed(() => {
  const sourceAccounts = accounts.value
  if (!accountsSortBy.value) return sourceAccounts

  const sorted = [...sourceAccounts].sort((a, b) => {
    let aVal = a[accountsSortBy.value]
    let bVal = b[accountsSortBy.value]

    // 处理统计数据
    if (accountsSortBy.value === 'dailyTokens') {
      aVal = a.usage?.daily?.allTokens || 0
      bVal = b.usage?.daily?.allTokens || 0
    } else if (accountsSortBy.value === 'dailyRequests') {
      aVal = a.usage?.daily?.requests || 0
      bVal = b.usage?.daily?.requests || 0
    } else if (accountsSortBy.value === 'totalTokens') {
      aVal = a.usage?.total?.allTokens || 0
      bVal = b.usage?.total?.allTokens || 0
    }

    // 处理最后使用时间
    if (accountsSortBy.value === 'lastUsed') {
      aVal = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0
      bVal = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0
    }

    // 处理状态
    if (accountsSortBy.value === 'status') {
      aVal = a.isActive ? 1 : 0
      bVal = b.isActive ? 1 : 0
    }

    if (aVal < bVal) return accountsSortOrder.value === 'asc' ? -1 : 1
    if (aVal > bVal) return accountsSortOrder.value === 'asc' ? 1 : -1
    return 0
  })

  return sorted
})

// 加载账户列表
const loadAccounts = async (forceReload = false) => {
  accountsLoading.value = true
  try {
    // 检查是否选择了特定分组
    if (groupFilter.value && groupFilter.value !== 'all' && groupFilter.value !== 'ungrouped') {
      // 直接调用分组成员接口
      const response = await apiClient.get(`/admin/account-groups/${groupFilter.value}/members`)
      if (response.success) {
        // 分组成员接口已经包含了完整的账户信息，直接使用
        accounts.value = response.data
        accountsLoading.value = false
        return
      }
    }

    // 构建查询参数（用于其他筛选情况）
    const params = {}
    if (platformFilter.value !== 'all') {
      params.platform = platformFilter.value
    }
    if (groupFilter.value === 'ungrouped') {
      params.groupId = groupFilter.value
    }

    // 根据平台筛选决定需要请求哪些接口
    const requests = []

    if (platformFilter.value === 'all') {
      // 请求所有平台
      requests.push(
        apiClient.get('/admin/claude-accounts', { params }),
        apiClient.get('/admin/claude-console-accounts', { params }),
        apiClient.get('/admin/bedrock-accounts', { params }),
        apiClient.get('/admin/gemini-accounts', { params }),
        apiClient.get('/admin/openai-accounts', { params }),
        apiClient.get('/admin/azure-openai-accounts', { params }),
        apiClient.get('/admin/openai-responses-accounts', { params }),
        apiClient.get('/admin/ccr-accounts', { params })
      )
    } else {
      // 只请求指定平台，其他平台设为null占位
      switch (platformFilter.value) {
        case 'claude':
          requests.push(
            apiClient.get('/admin/claude-accounts', { params }),
            Promise.resolve({ success: true, data: [] }), // claude-console 占位
            Promise.resolve({ success: true, data: [] }), // bedrock 占位
            Promise.resolve({ success: true, data: [] }), // gemini 占位
            Promise.resolve({ success: true, data: [] }), // openai 占位
            Promise.resolve({ success: true, data: [] }), // azure-openai 占位
            Promise.resolve({ success: true, data: [] }) // openai-responses 占位
          )
          break
        case 'claude-console':
          requests.push(
            Promise.resolve({ success: true, data: [] }), // claude 占位
            apiClient.get('/admin/claude-console-accounts', { params }),
            Promise.resolve({ success: true, data: [] }), // bedrock 占位
            Promise.resolve({ success: true, data: [] }), // gemini 占位
            Promise.resolve({ success: true, data: [] }), // openai 占位
            Promise.resolve({ success: true, data: [] }), // azure-openai 占位
            Promise.resolve({ success: true, data: [] }) // openai-responses 占位
          )
          break
        case 'bedrock':
          requests.push(
            Promise.resolve({ success: true, data: [] }), // claude 占位
            Promise.resolve({ success: true, data: [] }), // claude-console 占位
            apiClient.get('/admin/bedrock-accounts', { params }),
            Promise.resolve({ success: true, data: [] }), // gemini 占位
            Promise.resolve({ success: true, data: [] }), // openai 占位
            Promise.resolve({ success: true, data: [] }), // azure-openai 占位
            Promise.resolve({ success: true, data: [] }) // openai-responses 占位
          )
          break
        case 'gemini':
          requests.push(
            Promise.resolve({ success: true, data: [] }), // claude 占位
            Promise.resolve({ success: true, data: [] }), // claude-console 占位
            Promise.resolve({ success: true, data: [] }), // bedrock 占位
            apiClient.get('/admin/gemini-accounts', { params }),
            Promise.resolve({ success: true, data: [] }), // openai 占位
            Promise.resolve({ success: true, data: [] }), // azure-openai 占位
            Promise.resolve({ success: true, data: [] }) // openai-responses 占位
          )
          break
        case 'openai':
          requests.push(
            Promise.resolve({ success: true, data: [] }), // claude 占位
            Promise.resolve({ success: true, data: [] }), // claude-console 占位
            Promise.resolve({ success: true, data: [] }), // bedrock 占位
            Promise.resolve({ success: true, data: [] }), // gemini 占位
            apiClient.get('/admin/openai-accounts', { params }),
            Promise.resolve({ success: true, data: [] }), // azure-openai 占位
            Promise.resolve({ success: true, data: [] }) // openai-responses 占位
          )
          break
        case 'azure_openai':
          requests.push(
            Promise.resolve({ success: true, data: [] }), // claude 占位
            Promise.resolve({ success: true, data: [] }), // claude-console 占位
            Promise.resolve({ success: true, data: [] }), // bedrock 占位
            Promise.resolve({ success: true, data: [] }), // gemini 占位
            Promise.resolve({ success: true, data: [] }), // openai 占位
            apiClient.get('/admin/azure-openai-accounts', { params }),
            Promise.resolve({ success: true, data: [] }) // openai-responses 占位
          )
          break
        case 'openai-responses':
          requests.push(
            Promise.resolve({ success: true, data: [] }), // claude 占位
            Promise.resolve({ success: true, data: [] }), // claude-console 占位
            Promise.resolve({ success: true, data: [] }), // bedrock 占位
            Promise.resolve({ success: true, data: [] }), // gemini 占位
            Promise.resolve({ success: true, data: [] }), // openai 占位
            Promise.resolve({ success: true, data: [] }), // azure-openai 占位
            apiClient.get('/admin/openai-responses-accounts', { params })
          )
          break
        case 'ccr':
          requests.push(
            Promise.resolve({ success: true, data: [] }), // claude 占位
            Promise.resolve({ success: true, data: [] }), // claude-console 占位
            Promise.resolve({ success: true, data: [] }), // bedrock 占位
            Promise.resolve({ success: true, data: [] }), // gemini 占位
            Promise.resolve({ success: true, data: [] }), // openai 占位
            Promise.resolve({ success: true, data: [] }), // azure 占位
            apiClient.get('/admin/ccr-accounts', { params })
          )
          break
        default:
          // 默认情况下返回空数组
          requests.push(
            Promise.resolve({ success: true, data: [] }),
            Promise.resolve({ success: true, data: [] }),
            Promise.resolve({ success: true, data: [] }),
            Promise.resolve({ success: true, data: [] }),
            Promise.resolve({ success: true, data: [] }),
            Promise.resolve({ success: true, data: [] }),
            Promise.resolve({ success: true, data: [] })
          )
          break
      }
    }

    // 使用缓存机制加载 API Keys 和分组数据
    await Promise.all([loadApiKeys(forceReload), loadAccountGroups(forceReload)])

    // 后端账户API已经包含分组信息，不需要单独加载分组成员关系
    // await loadGroupMembers(forceReload)

    const [
      claudeData,
      claudeConsoleData,
      bedrockData,
      geminiData,
      openaiData,
      azureOpenaiData,
      openaiResponsesData,
      ccrData
    ] = await Promise.all(requests)

    const allAccounts = []

    if (claudeData.success) {
      const claudeAccounts = (claudeData.data || []).map((acc) => {
        // 计算每个Claude账户绑定的API Key数量
        const boundApiKeysCount = apiKeys.value.filter(
          (key) => key.claudeAccountId === acc.id
        ).length
        // 后端已经包含了groupInfos，直接使用
        return { ...acc, platform: 'claude', boundApiKeysCount }
      })
      allAccounts.push(...claudeAccounts)
    }

    if (claudeConsoleData.success) {
      const claudeConsoleAccounts = (claudeConsoleData.data || []).map((acc) => {
        // 计算每个Claude Console账户绑定的API Key数量
        const boundApiKeysCount = apiKeys.value.filter(
          (key) => key.claudeConsoleAccountId === acc.id
        ).length
        // 后端已经包含了groupInfos，直接使用
        return { ...acc, platform: 'claude-console', boundApiKeysCount }
      })
      allAccounts.push(...claudeConsoleAccounts)
    }

    if (bedrockData.success) {
      const bedrockAccounts = (bedrockData.data || []).map((acc) => {
        // Bedrock账户暂时不支持直接绑定
        // 后端已经包含了groupInfos，直接使用
        return { ...acc, platform: 'bedrock', boundApiKeysCount: 0 }
      })
      allAccounts.push(...bedrockAccounts)
    }

    if (geminiData.success) {
      const geminiAccounts = (geminiData.data || []).map((acc) => {
        // 计算每个Gemini账户绑定的API Key数量
        const boundApiKeysCount = apiKeys.value.filter(
          (key) => key.geminiAccountId === acc.id
        ).length
        // 后端已经包含了groupInfos，直接使用
        return { ...acc, platform: 'gemini', boundApiKeysCount }
      })
      allAccounts.push(...geminiAccounts)
    }
    if (openaiData.success) {
      const openaiAccounts = (openaiData.data || []).map((acc) => {
        // 计算每个OpenAI账户绑定的API Key数量
        const boundApiKeysCount = apiKeys.value.filter(
          (key) => key.openaiAccountId === acc.id
        ).length
        // 后端已经包含了groupInfos，直接使用
        return { ...acc, platform: 'openai', boundApiKeysCount }
      })
      allAccounts.push(...openaiAccounts)
    }
    if (azureOpenaiData && azureOpenaiData.success) {
      const azureOpenaiAccounts = (azureOpenaiData.data || []).map((acc) => {
        // 计算每个Azure OpenAI账户绑定的API Key数量
        const boundApiKeysCount = apiKeys.value.filter(
          (key) => key.azureOpenaiAccountId === acc.id
        ).length
        // 后端已经包含了groupInfos，直接使用
        return { ...acc, platform: 'azure_openai', boundApiKeysCount }
      })
      allAccounts.push(...azureOpenaiAccounts)
    }

    if (openaiResponsesData && openaiResponsesData.success) {
      const openaiResponsesAccounts = (openaiResponsesData.data || []).map((acc) => {
        // 计算每个OpenAI-Responses账户绑定的API Key数量
        // OpenAI-Responses账户使用 responses: 前缀
        const boundApiKeysCount = apiKeys.value.filter(
          (key) => key.openaiAccountId === `responses:${acc.id}`
        ).length
        // 后端已经包含了groupInfos，直接使用
        return { ...acc, platform: 'openai-responses', boundApiKeysCount }
      })
      allAccounts.push(...openaiResponsesAccounts)
    }

    // CCR 账户
    if (ccrData && ccrData.success) {
      const ccrAccounts = (ccrData.data || []).map((acc) => {
        // CCR 不支持 API Key 绑定，固定为 0
        return { ...acc, platform: 'ccr', boundApiKeysCount: 0 }
      })
      allAccounts.push(...ccrAccounts)
    }

    // 根据分组筛选器过滤账户
    let filteredAccounts = allAccounts
    if (groupFilter.value !== 'all') {
      if (groupFilter.value === 'ungrouped') {
        // 筛选未分组的账户（没有 groupInfos 或 groupInfos 为空数组）
        filteredAccounts = allAccounts.filter((account) => {
          return !account.groupInfos || account.groupInfos.length === 0
        })
      } else {
        // 筛选属于特定分组的账户
        filteredAccounts = allAccounts.filter((account) => {
          if (!account.groupInfos || account.groupInfos.length === 0) {
            return false
          }
          // 检查账户是否属于选中的分组
          return account.groupInfos.some((group) => group.id === groupFilter.value)
        })
      }
    }

    accounts.value = filteredAccounts
  } catch (error) {
    showToast('加载账户失败', 'error')
  } finally {
    accountsLoading.value = false
  }
}

// 排序账户
const sortAccounts = (field) => {
  if (field) {
    if (accountsSortBy.value === field) {
      accountsSortOrder.value = accountsSortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      accountsSortBy.value = field
      accountsSortOrder.value = 'asc'
    }
  }
}

// 已统一使用 formatTokenCount 展示 K/M 单位

// 格式化最后使用时间
const formatLastUsed = (dateString) => {
  if (!dateString) return '从未使用'

  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`

  return date.toLocaleDateString('zh-CN')
}

// 加载API Keys列表（缓存版本）
const loadApiKeys = async (forceReload = false) => {
  if (!forceReload && apiKeysLoaded.value) {
    return // 使用缓存数据
  }

  try {
    const response = await apiClient.get('/admin/api-keys')
    if (response.success) {
      apiKeys.value = response.data || []
      apiKeysLoaded.value = true
    }
  } catch (error) {
    // 静默处理错误
  }
}

// 加载账户分组列表（缓存版本）
const loadAccountGroups = async (forceReload = false) => {
  if (!forceReload && groupsLoaded.value) {
    return // 使用缓存数据
  }

  try {
    const response = await apiClient.get('/admin/account-groups')
    if (response.success) {
      accountGroups.value = response.data || []
      groupsLoaded.value = true
    }
  } catch (error) {
    // 静默处理错误
  }
}

// 清空缓存的函数
const clearCache = () => {
  apiKeysLoaded.value = false
  groupsLoaded.value = false
  groupMembersLoaded.value = false
  accountGroupMap.value.clear()
}

// 按平台筛选账户
const filterByPlatform = () => {
  loadAccounts()
}

// 按分组筛选账户
const filterByGroup = () => {
  loadAccounts()
}

// 格式化代理信息显示
const formatProxyDisplay = (proxy) => {
  if (!proxy || !proxy.host || !proxy.port) return null

  // 缩短类型名称
  const typeShort = proxy.type === 'socks5' ? 'S5' : proxy.type.toUpperCase()

  // 缩短主机名（如果太长）
  let host = proxy.host
  if (host.length > 15) {
    host = host.substring(0, 12) + '...'
  }

  let display = `${typeShort}://${host}:${proxy.port}`

  // 如果有用户名密码，添加认证信息（部分隐藏）
  if (proxy.username) {
    display = `${typeShort}://***@${host}:${proxy.port}`
  }

  return display
}

// 格式化会话窗口时间
const formatSessionWindow = (windowStart, windowEnd) => {
  if (!windowStart || !windowEnd) return '--'

  const start = new Date(windowStart)
  const end = new Date(windowEnd)

  const startHour = start.getHours().toString().padStart(2, '0')
  const startMin = start.getMinutes().toString().padStart(2, '0')
  const endHour = end.getHours().toString().padStart(2, '0')
  const endMin = end.getMinutes().toString().padStart(2, '0')

  return `${startHour}:${startMin} - ${endHour}:${endMin}`
}

// 格式化剩余时间
const formatRemainingTime = (minutes) => {
  if (!minutes || minutes <= 0) return '已结束'

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours > 0) {
    return `${hours}小时${mins}分钟`
  }
  return `${mins}分钟`
}

// 格式化限流时间（支持显示天数）
const formatRateLimitTime = (minutes) => {
  if (!minutes || minutes <= 0) return ''

  // 转换为整数，避免小数
  minutes = Math.floor(minutes)

  // 计算天数、小时和分钟
  const days = Math.floor(minutes / 1440) // 1天 = 1440分钟
  const remainingAfterDays = minutes % 1440
  const hours = Math.floor(remainingAfterDays / 60)
  const mins = remainingAfterDays % 60

  // 根据时间长度返回不同格式
  if (days > 0) {
    // 超过1天，显示天数和小时
    if (hours > 0) {
      return `${days}天${hours}小时`
    }
    return `${days}天`
  } else if (hours > 0) {
    // 超过1小时但不到1天，显示小时和分钟
    if (mins > 0) {
      return `${hours}小时${mins}分钟`
    }
    return `${hours}小时`
  } else {
    // 不到1小时，只显示分钟
    return `${mins}分钟`
  }
}

// 打开创建账户模态框
const openCreateAccountModal = () => {
  newAccountPlatform.value = null // 重置选择的平台
  showCreateAccountModal.value = true
}

// 关闭创建账户模态框
const closeCreateAccountModal = () => {
  showCreateAccountModal.value = false
  newAccountPlatform.value = null
}

// 编辑账户
const editAccount = (account) => {
  editingAccount.value = account
  showEditAccountModal.value = true
}

// 删除账户
const deleteAccount = async (account) => {
  // 检查是否有API Key绑定到此账号
  const boundKeysCount = apiKeys.value.filter(
    (key) =>
      key.claudeAccountId === account.id ||
      key.claudeConsoleAccountId === account.id ||
      key.geminiAccountId === account.id ||
      key.openaiAccountId === account.id ||
      key.azureOpenaiAccountId === account.id ||
      key.openaiAccountId === `responses:${account.id}`
  ).length

  if (boundKeysCount > 0) {
    showToast(
      `无法删除此账号，有 ${boundKeysCount} 个API Key绑定到此账号，请先解绑所有API Key`,
      'error'
    )
    return
  }

  const confirmed = await showConfirm(
    '删除账户',
    `确定要删除账户 "${account.name}" 吗？\n\n此操作不可恢复。`,
    '删除',
    '取消'
  )

  if (!confirmed) return

  try {
    let endpoint
    if (account.platform === 'claude') {
      endpoint = `/admin/claude-accounts/${account.id}`
    } else if (account.platform === 'claude-console') {
      endpoint = `/admin/claude-console-accounts/${account.id}`
    } else if (account.platform === 'bedrock') {
      endpoint = `/admin/bedrock-accounts/${account.id}`
    } else if (account.platform === 'openai') {
      endpoint = `/admin/openai-accounts/${account.id}`
    } else if (account.platform === 'azure_openai') {
      endpoint = `/admin/azure-openai-accounts/${account.id}`
    } else if (account.platform === 'openai-responses') {
      endpoint = `/admin/openai-responses-accounts/${account.id}`
    } else if (account.platform === 'ccr') {
      endpoint = `/admin/ccr-accounts/${account.id}`
    } else {
      endpoint = `/admin/gemini-accounts/${account.id}`
    }

    const data = await apiClient.delete(endpoint)

    if (data.success) {
      showToast('账户已删除', 'success')
      // 清空分组成员缓存，因为账户可能从分组中移除
      groupMembersLoaded.value = false
      loadAccounts()
    } else {
      showToast(data.message || '删除失败', 'error')
    }
  } catch (error) {
    showToast('删除失败', 'error')
  }
}

// 重置账户状态
const resetAccountStatus = async (account) => {
  if (account.isResetting) return

  let confirmed = false
  if (window.showConfirm) {
    confirmed = await window.showConfirm(
      '重置账户状态',
      '确定要重置此账户的所有异常状态吗？这将清除限流状态、401错误计数等所有异常标记。',
      '确定重置',
      '取消'
    )
  } else {
    confirmed = confirm('确定要重置此账户的所有异常状态吗？')
  }

  if (!confirmed) return

  try {
    account.isResetting = true

    // 根据账户平台选择不同的 API 端点
    let endpoint = ''
    if (account.platform === 'openai') {
      endpoint = `/admin/openai-accounts/${account.id}/reset-status`
    } else if (account.platform === 'openai-responses') {
      endpoint = `/admin/openai-responses-accounts/${account.id}/reset-status`
    } else if (account.platform === 'claude') {
      endpoint = `/admin/claude-accounts/${account.id}/reset-status`
    } else if (account.platform === 'claude-console') {
      endpoint = `/admin/claude-console-accounts/${account.id}/reset-status`
    } else if (account.platform === 'ccr') {
      endpoint = `/admin/ccr-accounts/${account.id}/reset-status`
    } else {
      showToast('不支持的账户类型', 'error')
      account.isResetting = false
      return
    }

    const data = await apiClient.post(endpoint)

    if (data.success) {
      showToast('账户状态已重置', 'success')
      // 强制刷新，绕过前端缓存，确保最终一致性
      loadAccounts(true)
    } else {
      showToast(data.message || '状态重置失败', 'error')
    }
  } catch (error) {
    showToast('状态重置失败', 'error')
  } finally {
    account.isResetting = false
  }
}

// 切换调度状态
const toggleSchedulable = async (account) => {
  if (account.isTogglingSchedulable) return

  try {
    account.isTogglingSchedulable = true

    let endpoint
    if (account.platform === 'claude') {
      endpoint = `/admin/claude-accounts/${account.id}/toggle-schedulable`
    } else if (account.platform === 'claude-console') {
      endpoint = `/admin/claude-console-accounts/${account.id}/toggle-schedulable`
    } else if (account.platform === 'bedrock') {
      endpoint = `/admin/bedrock-accounts/${account.id}/toggle-schedulable`
    } else if (account.platform === 'gemini') {
      endpoint = `/admin/gemini-accounts/${account.id}/toggle-schedulable`
    } else if (account.platform === 'openai') {
      endpoint = `/admin/openai-accounts/${account.id}/toggle-schedulable`
    } else if (account.platform === 'azure_openai') {
      endpoint = `/admin/azure-openai-accounts/${account.id}/toggle-schedulable`
    } else if (account.platform === 'openai-responses') {
      endpoint = `/admin/openai-responses-accounts/${account.id}/toggle-schedulable`
    } else if (account.platform === 'ccr') {
      endpoint = `/admin/ccr-accounts/${account.id}/toggle-schedulable`
    } else {
      showToast('该账户类型暂不支持调度控制', 'warning')
      return
    }

    const data = await apiClient.put(endpoint)

    if (data.success) {
      account.schedulable = data.schedulable
      showToast(data.schedulable ? '已启用调度' : '已禁用调度', 'success')
    } else {
      showToast(data.message || '操作失败', 'error')
    }
  } catch (error) {
    showToast('切换调度状态失败', 'error')
  } finally {
    account.isTogglingSchedulable = false
  }
}

// 处理创建成功
const handleCreateSuccess = () => {
  showCreateAccountModal.value = false
  showToast('账户创建成功', 'success')
  // 清空缓存，因为可能涉及分组关系变化
  clearCache()
  loadAccounts()
}

// 处理编辑成功
const handleEditSuccess = () => {
  showEditAccountModal.value = false
  showToast('账户更新成功', 'success')
  // 清空分组成员缓存，因为账户类型和分组可能发生变化
  groupMembersLoaded.value = false
  loadAccounts()
}

// 切换账户模型统计展开状态
const toggleAccountModelStats = async (accountId) => {
  if (expandedAccountModelStats.value.has(accountId)) {
    expandedAccountModelStats.value.delete(accountId)
  } else {
    expandedAccountModelStats.value.add(accountId)
    // 首次展开时直接调用API获取完整数据（包括费用和token详细信息）
    await loadAccountModelStats(accountId, true)
  }
}

// 加载账户模型统计数据
const loadAccountModelStats = async (accountId, forceReload = false) => {
  if (!forceReload && accountModelStatsLoaded.value[accountId]) {
    return
  }

  // 如果不是强制重载，首先尝试从会话窗口数据中获取模型分布
  if (!forceReload) {
    const account = accounts.value.find((acc) => acc.id === accountId)
    if (
      account &&
      account.sessionWindow &&
      account.sessionWindow.windowUsage &&
      account.sessionWindow.windowUsage.modelDistribution
    ) {
      const modelDistribution = account.sessionWindow.windowUsage.modelDistribution
      const modelStats = Object.entries(modelDistribution).map(([model, data]) => ({
        model,
        requests: data.requests || 0,
        allTokens: data.tokens || 0,
        inputTokens: 0, // 会话窗口数据中没有详细的input/output分解
        outputTokens: 0,
        cacheCreateTokens: 0,
        cacheReadTokens: 0,
        // 会话窗口数据作为后备方案，正常情况下会直接调用API
        formatted: {
          total: '$0.000000'
        }
      }))
      accountModelStats.value[accountId] = modelStats
      accountModelStatsLoaded.value[accountId] = true
      return
    }
  }

  // 调用API获取最新数据
  accountModelStatsLoading.value[accountId] = true

  try {
    const account = accounts.value.find((acc) => acc.id === accountId)
    const endpointBase =
      account && account.platform === 'openai' ? 'openai-accounts' : 'claude-accounts'
    const response = await apiClient.get(`/admin/${endpointBase}/${accountId}/model-stats`)
    if (response.success) {
      accountModelStats.value[accountId] = response.data || []
      accountModelStatsLoaded.value[accountId] = true
    }
  } catch (error) {
    console.error('Failed to load account model stats:', error)
    accountModelStats.value[accountId] = []
    showToast('加载模型统计失败', 'error')
  } finally {
    accountModelStatsLoading.value[accountId] = false
  }
}

// 计算账户模型使用百分比
const calculateAccountModelPercentage = (value, stats) => {
  const total = stats.reduce((sum, stat) => sum + (stat.allTokens || 0), 0)
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

// 计算单个模型费用（复用API Keys的逻辑）
const calculateModelCost = (stat) => {
  // 优先使用后端返回的费用数据
  if (stat.formatted && stat.formatted.total) {
    return stat.formatted.total
  }

  // 如果没有 formatted 数据，尝试使用 cost 字段
  if (stat.cost !== undefined) {
    return `$${stat.cost.toFixed(6)}`
  }

  // 默认返回
  return '$0.000000'
}

// 格式化Token计数
const formatTokenCount = (count) => {
  if (!count) return '0'
  if (count >= 1000000) {
    return (count / 1000000).toFixed(2) + 'M'
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K'
  }
  return count.toString()
}

// 获取 Claude 账号的添加方式
const getClaudeAuthType = (account) => {
  // 基于 lastRefreshAt 判断：如果为空说明是 Setup Token（不能刷新），否则是 OAuth
  if (!account.lastRefreshAt || account.lastRefreshAt === '') {
    return 'Setup' // 缩短显示文本
  }
  return 'OAuth'
}

// 获取 Gemini 账号的添加方式
const getGeminiAuthType = () => {
  // Gemini 统一显示 OAuth
  return 'OAuth'
}

// 获取 OpenAI 账号的添加方式
const getOpenAIAuthType = () => {
  // OpenAI 统一显示 OAuth
  return 'OAuth'
}

// 获取 Claude 账号类型显示
const getClaudeAccountType = (account) => {
  // 如果有订阅信息
  if (account.subscriptionInfo) {
    try {
      // 如果 subscriptionInfo 是字符串，尝试解析
      const info =
        typeof account.subscriptionInfo === 'string'
          ? JSON.parse(account.subscriptionInfo)
          : account.subscriptionInfo

      // 订阅信息已解析

      // 根据 has_claude_max 和 has_claude_pro 判断
      if (info.hasClaudeMax === true) {
        return 'Claude Max'
      } else if (info.hasClaudePro === true) {
        return 'Claude Pro'
      } else {
        return 'Claude Free'
      }
    } catch (e) {
      // 解析失败，返回默认值
      return 'Claude'
    }
  }

  // 没有订阅信息，保持原有显示
  return 'Claude'
}

// 获取停止调度的原因
const getSchedulableReason = (account) => {
  if (account.schedulable !== false) return null

  // Claude Console 账户的错误状态
  if (account.platform === 'claude-console') {
    if (account.status === 'unauthorized') {
      return 'API Key无效或已过期（401错误）'
    }
    if (account.overloadStatus === 'overloaded') {
      return '服务过载（529错误）'
    }
    if (account.rateLimitStatus === 'limited') {
      return '触发限流（429错误）'
    }
    if (account.status === 'blocked' && account.errorMessage) {
      return account.errorMessage
    }
  }

  // Claude 官方账户的错误状态
  if (account.platform === 'claude') {
    if (account.status === 'unauthorized') {
      return '认证失败（401错误）'
    }
    if (account.status === 'temp_error' && account.errorMessage) {
      return account.errorMessage
    }
    if (account.status === 'error' && account.errorMessage) {
      return account.errorMessage
    }
    if (account.isRateLimited) {
      return '触发限流（429错误）'
    }
    // 自动停止调度的原因
    if (account.stoppedReason) {
      return account.stoppedReason
    }
  }

  // OpenAI 账户的错误状态
  if (account.platform === 'openai') {
    if (account.status === 'unauthorized') {
      return '认证失败（401错误）'
    }
    // 检查限流状态 - 兼容嵌套的 rateLimitStatus 对象
    if (
      (account.rateLimitStatus && account.rateLimitStatus.isRateLimited) ||
      account.isRateLimited
    ) {
      return '触发限流（429错误）'
    }
    if (account.status === 'error' && account.errorMessage) {
      return account.errorMessage
    }
  }

  // OpenAI-Responses 账户的错误状态
  if (account.platform === 'openai-responses') {
    if (account.status === 'unauthorized') {
      return '认证失败（401错误）'
    }
    // 检查限流状态 - 兼容嵌套的 rateLimitStatus 对象
    if (
      (account.rateLimitStatus && account.rateLimitStatus.isRateLimited) ||
      account.isRateLimited
    ) {
      return '触发限流（429错误）'
    }
    if (account.status === 'error' && account.errorMessage) {
      return account.errorMessage
    }
    if (account.status === 'rateLimited') {
      return '触发限流（429错误）'
    }
  }

  // 通用原因
  if (account.stoppedReason) {
    return account.stoppedReason
  }
  if (account.errorMessage) {
    return account.errorMessage
  }

  // 默认为手动停止
  return '手动停止调度'
}

// 获取账户状态文本
const getAccountStatusText = (account) => {
  // 检查是否被封锁
  if (account.status === 'blocked') return '已封锁'
  // 检查是否未授权（401错误）
  if (account.status === 'unauthorized') return '异常'
  // 检查是否限流
  if (
    account.isRateLimited ||
    account.status === 'rate_limited' ||
    (account.rateLimitStatus && account.rateLimitStatus.isRateLimited) ||
    account.rateLimitStatus === 'limited'
  )
    return '限流中'
  // 检查是否临时错误
  if (account.status === 'temp_error') return '临时异常'
  // 检查是否错误
  if (account.status === 'error' || !account.isActive) return '错误'
  // 检查是否可调度
  if (account.schedulable === false) return '已暂停'
  // 否则正常
  return '正常'
}

// 获取账户状态样式类
const getAccountStatusClass = (account) => {
  if (account.status === 'blocked') {
    return 'bg-red-100 text-red-800'
  }
  if (account.status === 'unauthorized') {
    return 'bg-red-100 text-red-800'
  }
  if (
    account.isRateLimited ||
    account.status === 'rate_limited' ||
    (account.rateLimitStatus && account.rateLimitStatus.isRateLimited) ||
    account.rateLimitStatus === 'limited'
  ) {
    return 'bg-orange-100 text-orange-800'
  }
  if (account.status === 'temp_error') {
    return 'bg-orange-100 text-orange-800'
  }
  if (account.status === 'error' || !account.isActive) {
    return 'bg-red-100 text-red-800'
  }
  if (account.schedulable === false) {
    return 'bg-gray-100 text-gray-800'
  }
  return 'bg-green-100 text-green-800'
}

// 获取账户状态点样式类
const getAccountStatusDotClass = (account) => {
  if (account.status === 'blocked') {
    return 'bg-red-500'
  }
  if (account.status === 'unauthorized') {
    return 'bg-red-500'
  }
  if (
    account.isRateLimited ||
    account.status === 'rate_limited' ||
    (account.rateLimitStatus && account.rateLimitStatus.isRateLimited) ||
    account.rateLimitStatus === 'limited'
  ) {
    return 'bg-orange-500'
  }
  if (account.status === 'temp_error') {
    return 'bg-orange-500'
  }
  if (account.status === 'error' || !account.isActive) {
    return 'bg-red-500'
  }
  if (account.schedulable === false) {
    return 'bg-gray-500'
  }
  return 'bg-green-500'
}

// 获取会话窗口百分比
// const getSessionWindowPercentage = (account) => {
//   if (!account.sessionWindow) return 100
//   const { remaining, total } = account.sessionWindow
//   if (!total || total === 0) return 100
//   return Math.round((remaining / total) * 100)
// }

// 格式化相对时间
const formatRelativeTime = (dateString) => {
  return formatLastUsed(dateString)
}

// 获取会话窗口进度条的样式类
const getSessionProgressBarClass = (status, account = null) => {
  // 根据状态返回不同的颜色类，包含防御性检查
  if (!status) {
    // 无状态信息时默认为蓝色
    return 'bg-gradient-to-r from-blue-500 to-indigo-600'
  }

  // 检查账号是否处于限流状态
  const isRateLimited =
    account &&
    (account.isRateLimited ||
      account.status === 'rate_limited' ||
      (account.rateLimitStatus && account.rateLimitStatus.isRateLimited) ||
      account.rateLimitStatus === 'limited')

  // 如果账号处于限流状态，显示红色
  if (isRateLimited) {
    return 'bg-gradient-to-r from-red-500 to-red-600'
  }

  // 转换为小写进行比较，避免大小写问题
  const normalizedStatus = String(status).toLowerCase()
  if (normalizedStatus === 'rejected') return 'bg-gradient-to-r from-red-500 to-red-600'
  if (normalizedStatus === 'allowed_warning')
    return 'bg-gradient-to-r from-yellow-500 to-orange-500'
  return 'bg-gradient-to-r from-blue-500 to-indigo-600'
}

// 格式化费用显示
const formatCost = (cost) => {
  if (!cost || cost === 0) return '0.0000'
  if (cost < 0.0001) return cost.toExponential(2)
  if (cost < 0.01) return cost.toFixed(6)
  if (cost < 1) return cost.toFixed(4)
  return cost.toFixed(2)
}

// 额度使用百分比（Claude Console）
const getQuotaUsagePercent = (account) => {
  const used = Number(account?.usage?.daily?.cost || 0)
  const quota = Number(account?.dailyQuota || 0)
  if (!quota || quota <= 0) return 0
  return (used / quota) * 100
}

// 额度进度条颜色（Claude Console）
const getQuotaBarClass = (percent) => {
  if (percent >= 90) return 'bg-red-500'
  if (percent >= 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

// 剩余额度（Claude Console）
const formatRemainingQuota = (account) => {
  const used = Number(account?.usage?.daily?.cost || 0)
  const quota = Number(account?.dailyQuota || 0)
  if (!quota || quota <= 0) return '0.00'
  return Math.max(0, quota - used).toFixed(2)
}

// 计算每日费用（使用后端返回的精确费用数据）
const calculateDailyCost = (account) => {
  if (!account.usage || !account.usage.daily) return '0.0000'

  // 如果后端已经返回了计算好的费用，直接使用
  if (account.usage.daily.cost !== undefined) {
    return formatCost(account.usage.daily.cost)
  }

  // 如果后端没有返回费用（旧版本），返回0
  return '0.0000'
}

// 切换调度状态
// const toggleDispatch = async (account) => {
//   await toggleSchedulable(account)
// }

// 监听排序选择变化
watch(accountSortBy, (newVal) => {
  const fieldMap = {
    name: 'name',
    dailyTokens: 'dailyTokens',
    dailyRequests: 'dailyRequests',
    totalTokens: 'totalTokens',
    lastUsed: 'lastUsed'
  }

  if (fieldMap[newVal]) {
    sortAccounts(fieldMap[newVal])
  }
})

onMounted(() => {
  // 首次加载时强制刷新所有数据
  loadAccounts(true)
})
</script>

<style scoped>
.table-container {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.table-row {
  transition: all 0.2s ease;
}

.table-row:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.accounts-container {
  min-height: calc(100vh - 300px);
}

.table-container {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.table-row {
  transition: all 0.2s ease;
}

.table-row:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>

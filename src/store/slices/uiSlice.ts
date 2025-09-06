import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// 类型定义
interface UIState {
  // 分支树面板
  branchTreePanel: {
    isVisible: boolean;
  };
  // 创建分支模态框
  createBranchModal: {
    isVisible: boolean;
    selectedMessageId: string | null;
    topic: string;
  };
  // Agent设置面板
  agentSettingsPanel: {
    isVisible: boolean;
  };
  // 侧边栏
  sidebar: {
    isCollapsed: boolean;
  };
  // 主题
  theme: 'light' | 'dark';
  // 通知
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    autoClose?: boolean;
  }>;
  // 加载状态
  globalLoading: boolean;
}

const initialState: UIState = {
  branchTreePanel: {
    isVisible: false,
  },
  createBranchModal: {
    isVisible: false,
    selectedMessageId: null,
    topic: '',
  },
  agentSettingsPanel: {
    isVisible: false,
  },
  sidebar: {
    isCollapsed: false,
  },
  theme: 'light',
  notifications: [],
  globalLoading: false,
};

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // 分支树面板
    toggleBranchTreePanel: (state) => {
      state.branchTreePanel.isVisible = !state.branchTreePanel.isVisible;
    },
    setBranchTreePanelVisible: (state, action: PayloadAction<boolean>) => {
      state.branchTreePanel.isVisible = action.payload;
    },
    
    // 创建分支模态框
    showCreateBranchModal: (state, action: PayloadAction<{ messageId: string }>) => {
      state.createBranchModal.isVisible = true;
      state.createBranchModal.selectedMessageId = action.payload.messageId;
      state.createBranchModal.topic = '';
    },
    hideCreateBranchModal: (state) => {
      state.createBranchModal.isVisible = false;
      state.createBranchModal.selectedMessageId = null;
      state.createBranchModal.topic = '';
    },
    setCreateBranchTopic: (state, action: PayloadAction<string>) => {
      state.createBranchModal.topic = action.payload;
    },
    
    // Agent设置面板
    toggleAgentSettingsPanel: (state) => {
      state.agentSettingsPanel.isVisible = !state.agentSettingsPanel.isVisible;
    },
    setAgentSettingsPanelVisible: (state, action: PayloadAction<boolean>) => {
      state.agentSettingsPanel.isVisible = action.payload;
    },
    
    // 侧边栏
    toggleSidebar: (state) => {
      state.sidebar.isCollapsed = !state.sidebar.isCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebar.isCollapsed = action.payload;
    },
    
    // 主题
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    
    // 通知
    addNotification: (state, action: PayloadAction<{
      type: 'success' | 'error' | 'warning' | 'info';
      message: string;
      autoClose?: boolean;
    }>) => {
      const notification = {
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        autoClose: true,
        ...action.payload,
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    
    // 全局加载状态
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
    
    // 重置UI状态
    resetUIState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  toggleBranchTreePanel,
  setBranchTreePanelVisible,
  showCreateBranchModal,
  hideCreateBranchModal,
  setCreateBranchTopic,
  toggleAgentSettingsPanel,
  setAgentSettingsPanelVisible,
  toggleSidebar,
  setSidebarCollapsed,
  setTheme,
  toggleTheme,
  addNotification,
  removeNotification,
  clearAllNotifications,
  setGlobalLoading,
  resetUIState,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectBranchTreePanel = (state: { ui: UIState }) => state.ui.branchTreePanel;

export const selectCreateBranchModal = (state: { ui: UIState }) => state.ui.createBranchModal;

export const selectAgentSettingsPanel = (state: { ui: UIState }) => state.ui.agentSettingsPanel;

export const selectSidebar = (state: { ui: UIState }) => state.ui.sidebar;

export const selectTheme = (state: { ui: UIState }) => state.ui.theme;

export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;

export const selectGlobalLoading = (state: { ui: UIState }) => state.ui.globalLoading;
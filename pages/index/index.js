Page({
  data: {
    customNavbarStyle: '',
    customButtonStyle: '',
    navBarHeight: 0,
    inputValue: ''
  },
  onLoad() {
    try {
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync();
      // 获取胶囊按钮信息
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      
      if (!menuButtonInfo) {
        console.error('获取胶囊按钮信息失败');
        return;
      }
      
      // 计算导航栏高度和上边距
      const statusBarHeight = systemInfo.statusBarHeight;
      const navBarHeight = menuButtonInfo.height + (menuButtonInfo.top - statusBarHeight) * 2;
      const totalNavHeight = navBarHeight + statusBarHeight;
      
      // 设置导航栏样式
      const customNavbarStyle = ` height: ${navBarHeight}px;padding-top:${statusBarHeight}px; `;
      
    
      
      // 更新数据
      this.setData({
        customNavbarStyle,
        navBarHeight: totalNavHeight
      });
      
    } catch (error) {
      console.error('初始化导航栏失败:', error);
    }
  },
  onShow() {
    // 页面显示时清空输入框
    this.setData({
      inputValue: '',
      inputValueKey: Date.now() // 每次 onShow 更新 key，强制刷新输入框
    });
  },
   // 处理输入框内容变化
   onInputChange(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },
      // 处理发送操作（包括按钮点击和输入框确认）
  onSend() {
    const { inputValue } = this.data;
    if (inputValue.trim() === '') {
      wx.showToast({
        title: '请输入您的问题',
        // icon: 'none'
        icon:"error"
      });
      return;
    }
    
    // 跳转到聊天页面并传递初始消息
    wx.navigateTo({
      url: `/pages/chat/chat?query=${encodeURIComponent(inputValue)}`
    });
    
    // 清空输入框
    this.setData({
      inputValue: ''
    });
  }

})
// pages/chat/chat.js
Page({
  data: {
    customNavbarStyle: '',
    navBarHeight: 0,
    plan: null,
    totalCost: 0
  },

  onLoad(options) {
    // 设置导航栏样式
    this.setNavBarStyle();
    
    // 解析传入的方案数据
    if (options.plan) {
      const plan = JSON.parse(decodeURIComponent(options.plan));
      this.setData({ 
        plan,
        totalCost: this.calculateTotalCost(plan)
      });
    }
  },

  calculateTotalCost(plan) {
    let total = 0;
    // 网约车费用
    if (plan.travel_way.includes('online_car')) {
      total += 35;
    }
    // 机票费用
    if (plan.travel_way.includes('bullet_train')) {
      total += 1000;
    }
    // 酒店费用
    if (plan.hotel) {
      total += 400;
    }
    return total;
  },

  setNavBarStyle() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      const statusBarHeight = systemInfo.statusBarHeight;
      
      // 根据胶囊按钮位置计算导航栏高度
      const navBarHeight = (menuButtonInfo.top - statusBarHeight) * 2 + menuButtonInfo.height;
      
      const customNavbarStyle = `
        height: ${navBarHeight}px;
        padding-top: ${statusBarHeight}px;
        padding-left: ${systemInfo.windowWidth - menuButtonInfo.right}px;
        padding-right: ${systemInfo.windowWidth - menuButtonInfo.right}px;
      `;
      
      this.setData({ 
        customNavbarStyle,
        navBarHeight: navBarHeight + statusBarHeight 
      });
    } catch (error) {
      console.error('设置导航栏样式失败:', error);
    }
  },

  onBack() {
    wx.navigateBack();
  },

  onConfirm() {
    wx.showToast({
      title: '预订成功',
      icon: 'success',
      duration: 2000
    });
    setTimeout(() => {
      wx.navigateBack({
        delta: 2  // 返回上两级页面
      });
    }, 2000);
  }
});
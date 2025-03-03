// pages/chat/chat.js
Page({
  data: {
    messages: [],
    inputValue: '',
    customNavbarStyle: '',
    scrollToMessage: '',
    contextHistory: []
  },

  onLoad(options) {
    // 获取从首页传来的初始消息
    const query = decodeURIComponent(options.query || '');
    if (query) {
      this.addMessage('user', query);
      this.sendToBackend(query);
    }
    
    // 设置导航栏样式
    this.setNavBarStyle();
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

  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  onSend() {
    const content = this.data.inputValue.trim();
    if (!content) {
      wx.showToast({
        title: '请输入内容',
        icon: 'error'
      });
      return;
    }
    
    this.addMessage('user', content);
    this.setData({ inputValue: '' });
    this.sendToBackend(content);
  },

  addMessage(type, content) {
    const messages = this.data.messages;
    const id = Date.now().toString();
    messages.push({
      id,
      type,
      content
    });
    
    this.setData({ 
      messages,
      scrollToMessage: id
    });
  },

  manageContextHistory() {
    // Implementation of manageContextHistory method
  },

  sendToBackend(message) {
    const contextHistory = this.data.contextHistory;
    contextHistory.push({
      role: 'user',
      content: message
    });

    this.manageContextHistory();

    wx.request({
      url: 'http://localhost:8000/chat',
      method: 'POST',
      data: {
        message: message,
        context: contextHistory
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log('后端返回数据:', res.data);
        if (res.data && res.data.response) {
          try {
            // 清理响应数据中的换行符和多余空格
            let cleanResponse = res.data.response.replace(/\\n/g, '').replace(/\s+/g, ' ').trim();
            
            // 解析返回的JSON数据
            let responseData = typeof cleanResponse === 'string' ? 
              JSON.parse(cleanResponse) : cleanResponse;
            
            console.log('解析后的数据:', responseData);
            
            // 添加到上下文
            contextHistory.push({
              role: 'assistant',
              content: cleanResponse
            });

            // 确保我们有一个有效的plans数组
            if (responseData && responseData.plans && Array.isArray(responseData.plans)) {
              // 为每个方案创建一条消息
              const newMessages = responseData.plans.map(plan => ({
                id: `${Date.now()}_${plan.plan_id}`,
                type: 'bot',
                isPlan: true,
                planData: {
                  plan_id: plan.plan_id,
                  plan_name: plan.plan_name || this.getPlanName(plan.plan_id),
                  travel_way: this.formatTravelWay(plan.travel_way),
                  cost: plan.cost,
                  time: plan.time,
                  hotel: plan.hotel,
                  advice: plan.advice
                }
              }));

              this.setData({ 
                contextHistory,
                messages: [...this.data.messages, ...newMessages],
                scrollToMessage: newMessages[newMessages.length - 1].id
              });
            } else {
              this.addMessage('bot', cleanResponse);
            }
          } catch (error) {
            console.error('解析计划数据失败:', error);
            this.addMessage('bot', typeof res.data.response === 'string' ? 
              res.data.response : JSON.stringify(res.data.response));
          }
        }
      },
      fail: (error) => {
        console.error('请求失败:', error);
        wx.showToast({
          title: '请求失败',
          icon: 'error'
        });
      }
    });
  },

  getPlanName(planId) {
    const planNames = {
      1: '省心方案',
      2: '高性价比方案',
      3: '经济型方案'
    };
    return planNames[planId] || '推荐方案';
  },

  formatTravelWay(travelWay) {
    if (Array.isArray(travelWay)) {
      return travelWay.join(' + ');
    }
    return travelWay;
  },

  onBack() {
    wx.navigateBack();
  }
});
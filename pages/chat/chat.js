// pages/chat/chat.js
Page({
  data: {
    messages: [],
    inputValue: '',
    customNavbarStyle: '',
    scrollToMessage: '',
    contextHistory: [],
    isLoading: false
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
    
    this.setData({ isLoading: true });
    
    // 添加重试机制
    const maxRetries = 3;
    let retryCount = 0;
    
    const makeRequest = () => {
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
        timeout: 30000, // 增加超时时间到30秒
        success: (res) => {
          console.log('后端返回数据:', res.data);
          if (res.data && res.data.response) {
            try {
              let cleanResponse = res.data.response.replace(/\\n/g, '').replace(/\s+/g, ' ').trim();
              let responseData = typeof cleanResponse === 'string' ? 
                JSON.parse(cleanResponse) : cleanResponse;
              
              console.log('解析后的数据:', responseData);
              
              contextHistory.push({
                role: 'assistant',
                content: cleanResponse
              });

              if (responseData && responseData.plans && Array.isArray(responseData.plans)) {
                const newMessage = {
                  id: Date.now().toString(),
                  type: 'bot',
                  isSummary: true,
                  content: responseData.summary || '',
                  plans: responseData.plans
                };

                this.setData({ 
                  contextHistory,
                  messages: [...this.data.messages, newMessage],
                  scrollToMessage: newMessage.id,
                  isLoading: false
                });
              } else {
                this.addMessage('bot', cleanResponse);
                this.setData({ isLoading: false });
              }
            } catch (error) {
              console.error('解析计划数据失败:', error);
              this.addMessage('bot', '抱歉，服务器返回的数据格式有误，请重试');
              this.setData({ isLoading: false });
            }
          }
        },
        fail: (error) => {
          console.error('请求失败:', error);
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`第${retryCount}次重试...`);
            setTimeout(() => {
              makeRequest();
            }, 1000 * retryCount); // 递增重试延迟
          } else {
            wx.showToast({
              title: '网络连接失败',
              icon: 'error',
              duration: 2000
            });
            this.addMessage('bot', '抱歉，网络连接出现问题，请稍后重试');
            this.setData({ isLoading: false });
          }
        }
      });
    };

    makeRequest();
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
  },
  onDetailsButtonTap(){
    wx.navigateTo({
      url: `/pages/detail/detail`
    });
  }
});
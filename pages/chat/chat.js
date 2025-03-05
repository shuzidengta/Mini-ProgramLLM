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
    
    // 限制历史记录长度，只保留最近的几条对话
    if (contextHistory.length > 10) {  // 比如保留最近5轮对话
      contextHistory.splice(0, 2);  // 每次删除最早的一轮对话（一问一答）
    }
    
    // 添加用户消息到上下文历史
    contextHistory.push({
      role: 'user',
      content: message
    });

    this.setData({ 
      isLoading: true,
      contextHistory
    });
    
    // 添加重试机制
    const maxRetries = 3;
    let retryCount = 0;
    
    const makeRequest = () => {
      wx.request({
        url: 'http://localhost:8000/chat1',
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
          if (res.statusCode === 200 && res.data && res.data.response) {
            try {
              // 清理和格式化 JSON 字符串
              let cleanResponse = res.data.response
                .replace(/\s+/g, ' ')  // 替换多个空白字符为单个空格
                .replace(/\\n/g, '')   // 移除换行符
                .trim();               // 移除首尾空白

              // 尝试修复常见的 JSON 格式错误
              if (cleanResponse.indexOf('_name"') !== -1) {  // 使用 indexOf 替代 includes
                cleanResponse = cleanResponse.replace(/_name"/g, 'name"');
              }

              // 尝试解析为 JSON
              const responseData = JSON.parse(cleanResponse);
              
              // 添加助手回复到上下文历史
              contextHistory.push({
                role: 'assistant',
                content: cleanResponse
              });
              
              if (responseData.plans && responseData.summary) {
                // 确保 plans 是有效的数组
                const plans = Array.isArray(responseData.plans) ? responseData.plans : [];
                
                // 规范化计划数据，添加起点和终点信息
                const normalizedPlans = plans.map((plan, index) => ({
                  plan_id: plan.plan_id || (index + 1),
                  plan_name: plan.plan_name || `方案${index + 1}`,
                  travel_way: plan.travel_way || '',
                  cost: plan.cost || '待定',
                  time: plan.time || '待定',
                  hotel: plan.hotel || '',
                  advice: plan.advice || '',
                  // 添加起点和终点信息
                  start: responseData.start || '',
                  end: responseData.end || ''
                }));

                // 添加调试日志
                console.log('规范化后的计划数据:', normalizedPlans);

                // 添加消息
                if (responseData.summary) {
                  const summaryMessage = {
                    id: Date.now().toString(),
                    type: 'assistant',
                    content: responseData.summary,
                    isSummary: true,
                    plans: normalizedPlans,
                    // 在消息级别也保存起点和终点信息
                    start: responseData.start,
                    end: responseData.end
                  };
                  
                  this.setData({
                    messages: [...this.data.messages, summaryMessage],
                    scrollToMessage: summaryMessage.id,
                    isLoading: false,
                    contextHistory
                  });
                }
              } else {
                // 如果不是计划数据，直接添加到聊天记录
                this.addMessage('assistant', res.data.response);
                this.setData({ 
                  isLoading: false,
                  contextHistory
                });
              }
            } catch (e) {
              console.error('JSON解析错误:', e);
              console.error('原始响应:', res.data.response);
              
              // 如果解析 JSON 失败，作为普通文本处理
              this.addMessage('assistant', res.data.response);
              
              contextHistory.push({
                role: 'assistant',
                content: res.data.response
              });
              
              this.setData({ 
                isLoading: false,
                contextHistory
              });
            }
          } else {
            wx.showToast({
              title: res.data.error || '获取回答失败',
              icon: 'none'
            });
            this.setData({ 
              isLoading: false,
              contextHistory
            });
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
            this.addMessage('assistant', '抱歉，网络连接出现问题，请稍后重试');
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
  onDetailsButtonTap(e) {
    const planData = e.currentTarget.dataset.planData;
    console.log('计划数据:', planData);  // 添加日志查看数据
    
    const params = {
      start: planData.start || '',
      end: planData.end || '',
      travel_way: planData.travel_way || ''
    };
    
    console.log('跳转参数:', params);  // 添加日志查看参数
    
    // 检查必要参数是否存在
    if (!params.travel_way) {
      wx.showToast({
        title: '出行方式数据缺失',
        icon: 'none'
      });
      return;
    }

    // 构建跳转 URL
    const url = `/pages/detail/detail?start=${params.start}&end=${params.end}&travel_way=${params.travel_way}`;

    wx.navigateTo({
      url: url,
      fail: (err) => {
        console.error('页面跳转失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  }
});    
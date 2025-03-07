// pages/chat/chat.js
Page({
  data: {
    messages: [],
    inputValue: '',
    customNavbarStyle: '',
    scrollToMessage: '',
    contextHistory: [],
    isLoading: false,
    autoPlay: false,
    isPlaying: false,
    audioQueue: [],
    currentAudioContext: null  // 新增：保存当前播放的音频实例
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
    
    // 从本地存储读取自动播放设置
    const autoPlay = wx.getStorageSync('autoPlay') || false;
    this.setData({ autoPlay });
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
    
    const userMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: content
    };

    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: '',
      isLoading: true
    }, () => {
      this.scrollToBottom(); // 发送消息后滚动
      this.sendToBackend(content); // 在回调中发送到后端
    });
  },

  addMessage(type, content) {
    const messages = this.data.messages;
    const id = `msg-${Date.now()}`;
    messages.push({
      id,
      type,
      content
    });
    
    this.setData({ 
      messages,
      scrollToMessage: id
    }, () => {
      this.scrollToBottom();
      
      // 如果是系统回复且开启了自动播放，则播放语音
      if (type === 'assistant' && this.data.autoPlay) {
        this.playAudio({
          currentTarget: {
            dataset: {
              text: content,
              messageId: id
            }
          }
        });
      }
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
              let responseData = typeof res.data.response === 'object' 
                ? res.data.response 
                : JSON.parse(res.data.response);

              // 2. 添加助手回复到上下文历史
              this.data.contextHistory.push({
                role: 'assistant',
                content: typeof res.data.response === 'string' 
                  ? res.data.response 
                  : JSON.stringify(res.data.response)
              });

              // 3. 判断是否包含行程规划数据
              if (responseData.plans && responseData.summary) {
                // 确保 plans 是数组
                const plans = Array.isArray(responseData.plans) ? responseData.plans : [];
                
                // 规范化计划数据
                const normalizedPlans = plans.map((plan, index) => ({
                  plan_id: parseInt(plan.plan_id || (index + 1)),
                  plan_name: plan.plan_name || `方案${index + 1}`,
                  travel_way: plan.travel_way || '',
                  cost: plan.cost || '待定',
                  time: plan.time || '待定',
                  hotel: plan.hotel || '',
                  advice: plan.advice || '',
                  start: responseData.start || '',
                  end: responseData.end || ''
                }));

                // 添加消息
                const summaryMessage = {
                  id: Date.now().toString(),
                  type: 'assistant',
                  content: responseData.summary,
                  isSummary: true,
                  plans: normalizedPlans,
                  start: responseData.start || '',
                  end: responseData.end || ''
                };

                this.setData({
                  messages: [...this.data.messages, summaryMessage],
                  scrollToMessage: summaryMessage.id,
                  isLoading: false,
                  contextHistory: this.data.contextHistory
                }, () => {
                  // 在消息添加完成后，如果开启了自动播放，则播放语音
                  if (this.data.autoPlay) {
                    this.playAudio({
                      currentTarget: {
                        dataset: {
                          text: responseData.summary,
                          messageId: summaryMessage.id
                        }
                      }
                    });
                  }
                });
                
              } else {
                // 普通文本消息处理
                const content = typeof responseData === 'string' 
                  ? responseData 
                  : responseData.text || JSON.stringify(responseData);
                
                const messageId = Date.now().toString();
                this.addMessage('assistant', content);
                
                // 在消息添加完成后，如果开启了自动播放，则播放语音
                if (this.data.autoPlay) {
                  this.playAudio({
                    currentTarget: {
                      dataset: {
                        text: content,
                        messageId: messageId
                      }
                    }
                  });
                }

                this.setData({ 
                  isLoading: false,
                  contextHistory: this.data.contextHistory
                });
              }
            } catch (e) {
              console.error('JSON解析错误:', e);
              console.error('原始响应:', res.data.response);
              
              // 作为普通文本处理
              const content = typeof res.data.response === 'string' 
                ? res.data.response 
                : '抱歉，处理响应时出现错误';
              
              this.addMessage('assistant', content);
              this.setData({ 
                isLoading: false,
                contextHistory: this.data.contextHistory
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
  },

  scrollToBottom() {
    const messages = this.data.messages;
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      this.setData({
        scrollToMessage: lastMessage.id
      });
    }
  },

  playAudio: function(e) {
    const text = e.currentTarget.dataset.text;
    const messageId = e.currentTarget.dataset.messageId;
    
    // 如果当前正在播放，检查是否已在队列中
    if (this.data.isPlaying) {
      // 检查是否已经在队列中
      const isDuplicate = this.data.audioQueue.some(item => 
        item.messageId === messageId
      );
      
      if (!isDuplicate) {
        this.data.audioQueue.push({ text, messageId });
      } else {
        wx.showToast({
          title: '你点的太快啦',
          icon: 'none',
          duration: 1000
        });
      }
      return;
    }
    
    this.setData({ isPlaying: true });
    
    wx.request({
      url: 'https://openspeech.bytedance.com/api/v1/tts',
      method: 'POST',
      header: {
        'Authorization': 'Bearer;GCAYy8FjiMP-URGBwu032IOge87CH7AB',
        'Content-Type': 'application/json'
      },
      data: {
        "app": {
          "appid": "3281983592",
          "token": "GCAYy8FjiMP-URGBwu032IOge87CH7AB",
          "cluster": "volcano_tts"
        },
        "user": {
          "uid": "uid883"
        },
        "audio": {
          "voice_type": "BV700_streaming",
          "encoding": "mp3",
          "compression_rate": 1,
          "rate": 24000,
          "speed_ratio": 1.0,
          "volume_ratio": 1.0,
          "pitch_ratio": 1.0,
          "emotion": "happy",
          "language": "cn"
        },
        "request": {
          "reqid": Date.now().toString(),
          "text": text,
          "text_type": "plain",
          "operation": "query",
          "silence_duration": "125",
          "with_frontend": "1",
          "frontend_type": "unitTson",
          "pure_english_opt": "1"
        }
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.data) {
          const base64Audio = res.data.data;
          const fsm = wx.getFileSystemManager();
          const FILE_PATH = `${wx.env.USER_DATA_PATH}/temp_audio_${messageId}.mp3`;
          
          try {
            fsm.writeFileSync(
              FILE_PATH,
              base64Audio,
              'base64'
            );
            
            const innerAudioContext = wx.createInnerAudioContext();
            this.setData({ currentAudioContext: innerAudioContext }); // 保存当前音频实例
            innerAudioContext.src = FILE_PATH;
            
            innerAudioContext.onError((err) => {
              console.error('音频播放错误:', err);
              wx.showToast({
                title: '播放失败',
                icon: 'none'
              });
              this.setData({ isPlaying: false });
              this.playNextInQueue(); // 播放失败时尝试播放队列中的下一个
            });
            
            innerAudioContext.play();
            
            innerAudioContext.onEnded(() => {
              // 播放结束后清理临时文件
              fsm.unlink({
                filePath: FILE_PATH,
                success: () => {
                  console.log('临时音频文件删除成功:', FILE_PATH);
                }
              });
              innerAudioContext.destroy();
              this.setData({ isPlaying: false });
              this.playNextInQueue(); // 播放完成后尝试播放队列中的下一个
            });
            
          } catch (error) {
            console.error('文件处理错误:', error);
            wx.showToast({
              title: '音频处理失败',
              icon: 'none'
            });
            this.setData({ isPlaying: false });
            this.playNextInQueue();
          }
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('请求失败:', error);
        wx.showToast({
          title: '语音合成失败',
          icon: 'none'
        });
        this.setData({ isPlaying: false });
        this.playNextInQueue();
      }
    });
  },

  // 新增：处理音频队列的方法
  playNextInQueue: function() {
    if (this.data.audioQueue.length > 0) {
      const nextAudio = this.data.audioQueue.shift();
      this.playAudio({
        currentTarget: {
          dataset: {
            text: nextAudio.text,
            messageId: nextAudio.messageId
          }
        }
      });
    }
  },

  // 添加开关切换处理方法
  onAutoPlayChange(e) {
    this.setData({
      autoPlay: e.detail.value
    });
    // 保存设置到本地存储
    wx.setStorageSync('autoPlay', e.detail.value);
  },

  // 新增：页面卸载时的处理
  onUnload: function() {
    // 停止当前正在播放的音频
    if (this.data.currentAudioContext) {
      this.data.currentAudioContext.stop();
      this.data.currentAudioContext.destroy();
    }
    
    // 清空播放队列
    this.setData({
      audioQueue: [],
      isPlaying: false,
      currentAudioContext: null
    });
  }
});    
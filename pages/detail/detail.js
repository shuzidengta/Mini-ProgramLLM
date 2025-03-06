// pages/chat/chat.js
Page({
  data: {
    customNavbarStyle: '',
    navBarHeight: 0,
    itinerary: null,
    totalCost: 0,
    start:'',
    end:'',
    travelWay:'',
    // 添加loading状态
    isLoading: true,
    // 添加图标映射配置
    iconMap: {
      网约车: 'taxi',
      打车: 'taxi',
      出租车: 'taxi',
      机场大巴: 'bus',
      公交车:'gongjiao',
      汽车: 'bus',
      地铁: 'subway',
      subway: 'subway',
      火车: 'train',
      飞机: 'airplane',
      flight:'airplane',
      步行: 'walk',
      酒店: 'hotel',
      hotel: 'hotel'
      // 可以根据需要添加更多类型
    },
    isPaymentModalVisible: false,
    password: ''
  },

  onLoad(options) {
    // 设置导航栏样式
    this.setNavBarStyle();
    // 解析传入的参数
    const start = decodeURIComponent(options.start || '');
    const end = decodeURIComponent(options.end || '');
    const travelWay = decodeURIComponent(options.travel_way || '');
    console.log(start,end,travelWay)
    
    //向后端发起请求
    wx.request({
      url: 'http://localhost:8000/chat2',  
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        message: JSON.stringify({
          start: start,
          end: end,
          travel_way: travelWay
        }),
        context: [] // 如果需要上下文，可以在这里添加历史对话
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.response) {
          try {
            // 尝试解析为 JSON
            const responseData = JSON.parse(res.data.response);
            // 如果是行程数据，设置行程信息
            if (responseData.itinerary) {
              this.setData({ 
                itinerary: responseData.itinerary,
                start: start,
                end: end,
                travelWay: travelWay,
                isLoading: false
              });
              this.calculateTotalCost();
            } else {
              // 如果不是行程数据，显示错误提示
              wx.showToast({
                title: '返回数据格式错误',
                icon: 'none'
              });
              this.setData({ isLoading: false });
            }
          } catch (e) {
            console.error('解析响应数据失败:', e);
            wx.showToast({
              title: '数据解析失败',
              icon: 'none'
            });
            this.setData({ isLoading: false });
          }
        } else {
          wx.showToast({
            title: res.data.error || '获取行程数据失败',
            icon: 'none'
          });
          this.setData({ isLoading: false });
        }
      },
      fail: (error) => {
        console.error('请求失败:', error);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        this.setData({ isLoading: false });
      }
    });
    
    // 计算总价
    this.calculateTotalCost();
  },

  calculateTotalCost() {
    if (!this.data.itinerary || !this.data.itinerary.segments) {
      return;
    }

    let total = 0;
    this.data.itinerary.segments.forEach(segment => {
      const price = parseFloat(segment.price);
      if (!isNaN(price)) {
        if (segment.type === 'hotel') {
          // 酒店需要乘以住宿天数
          total += price * segment.duration.nights;
        } else {
          total += price;
        }
      }
    });

    this.setData({
      totalCost: total
    });
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
        // 显示支付弹窗
        this.setData({
          isPaymentModalVisible: true
        });
    // wx.showToast({
    //   title: '预订成功',
    //   icon: 'success'
    // });
  },
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },
  onPaymentCancel() {
    this.setData({
      isPaymentModalVisible: false,
      password: '' // 清空密码
    });
  },
  onPaymentConfirm() {
    if (this.data.password.length !== 6) {
      wx.showToast({
        title: '请输入6位支付密码',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '支付处理中...',
    });

    // 模拟支付过程
    setTimeout(() => {
      wx.hideLoading();
      this.setData({
        isPaymentModalVisible: false,
        password: '' // 清空密码
      });
      wx.showToast({
        title: '支付成功',
        icon: 'success'
      });
    }, 1500);
  },
  simulatePayment() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const paymentResult ='success'; 
        resolve(paymentResult);
      }, 2000);
    });
  },
  
  // 编辑行程段
  onEditSegment(e) {
    const index = e.currentTarget.dataset.index;
    const segment = this.data.itinerary.segments[index];
    
    wx.showToast({
      title: '编辑功能开发中',
      icon: 'none'
    });
    
    // 这里可以跳转到编辑页面或显示编辑弹窗
    // 例如：
    /*
    wx.navigateTo({
      url: `/pages/edit/edit?index=${index}&type=${segment.type}`
    });
    */
  }
});
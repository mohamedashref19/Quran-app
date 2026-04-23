import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import localforage from 'localforage';

export const showAlert = (type, msg) => {
  const markup = `<div class="alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow" role="alert" style="z-index: 9999;">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
  document.body.insertAdjacentHTML('afterbegin', markup);
  window.setTimeout(() => { const alert = document.querySelector('.alert'); if (alert) alert.remove(); }, 3000);
};

export const resendOTP = async (emailToResend) => {
  try {
    let email = emailToResend;
    
    // إذا لم يتم تمرير إيميل، نحاول استرجاعه من التخزين المؤقت
    if (!email) {
      if (Capacitor.isNativePlatform()) {
        const stored = await Preferences.get({ key: 'verify_email' });
        email = stored.value;
      } else {
        email = sessionStorage.getItem('verify_email');
      }
    }

    if (!email) {
      showAlert('error', 'لا يوجد بريد إلكتروني مسجل لإرسال الكود');
      return;
    }

    const res = await axios({ method: 'POST', url: '/api/v1/users/resendOTP', data: { email } });
    if (res.data.status === 'success') {
      showAlert('success', 'تم إرسال كود تحقق جديد إلى بريدك الإلكتروني!');
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'خطأ في إعادة إرسال الكود');
  }
};

export const login = async (email, password) => {
  try {
    const res = await axios({ method: 'POST', url: '/api/v1/users/login', data: { email, password } });
    const token = res.data.token;

    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: 'auth_token', value: token });
      } else {
        localStorage.setItem('auth_token', token);
      }
    }

    const user = res.data.data?.user || res.data.user;
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      if (user.name) localStorage.setItem('name', user.name);
      
      // 🌟 إضافة الـ userId ليكون متاحاً لدالة الإشعارات
      localStorage.setItem('userId', user._id); 
    }

    if (res.data.status === 'success') {
      // 🌟 تفعيل إشعارات الدفع وربطها باليوزر الجديد فوراً
      if (Capacitor.isNativePlatform() && typeof initPushNotifications === 'function') {
        await initPushNotifications();
      }

      showAlert('success', 'تم تسجيل الدخول بنجاح!');
      window.setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          window.checkAuth();
          window.showSection('home');
        } else {
          location.assign('/');
        }
      }, 1000);
    }
  } catch (err) {
    if (err.response?.status === 403 && err.response?.data?.actionRequired === "VERIFY_OTP") {
      const pendingEmail = err.response.data.email || email;

      if (Capacitor.isNativePlatform()) {
        Preferences.set({ key: 'verify_email', value: pendingEmail });
      } else {
        sessionStorage.setItem('verify_email', pendingEmail);
      }

      showAlert('warning', 'حسابك غير مفعل، سيتم تحويلك لإدخال كود التحقق.');
      resendOTP(pendingEmail);

      window.setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          const emailInput = document.getElementById('verify-email');
          if (emailInput) emailInput.value = pendingEmail;
          window.showSection('verify-otp');
        } else {
          location.assign('/verify-otp.html');
        }
      }, 2000);

    } else {
      showAlert('error', err.response?.data?.message || 'خطأ في تسجيل الدخول');
    }
  }
};

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    const res = await axios({ method: 'POST', url: '/api/v1/users/signup', data: { name, email, password, passwordConfirm } });
    if (res.data.status === 'success') {
      showAlert('success', 'تم إنشاء الحساب! تفقد بريدك لتفعيل الحساب.');
      
      // 🌟 التعديل هنا: حفظ الإيميل مؤقتاً عشان لو طلب إعادة إرسال الكود
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: 'verify_email', value: email });
      } else {
        sessionStorage.setItem('verify_email', email);
      }

      window.setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          const emailInput = document.getElementById('verify-email');
          if (emailInput) emailInput.value = email;
          window.showSection('verify-otp');
        } else {
          location.assign('/verify-otp.html');
        }
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'خطأ في إنشاء الحساب');
  }
};

export const verifyOTP = async (email, otp) => {
  try {
    // محاولة جلب الإيميل من التخزين إذا لم يتم تمريره مباشرة
    if (!email) {
      if (Capacitor.isNativePlatform()) {
        const stored = await Preferences.get({ key: 'verify_email' });
        email = stored.value;
      } else {
        email = sessionStorage.getItem('verify_email');
      }
    }

    const res = await axios({ method: 'POST', url: '/api/v1/users/verifyOTP', data: { email, otp } });
    if (res.data.status === 'success') {
      showAlert('success', 'تم التفعيل!');
      
      // تنظيف الإيميل المؤقت
      if (Capacitor.isNativePlatform()) {
        Preferences.remove({ key: 'verify_email' });
      } else {
        sessionStorage.removeItem('verify_email');
      }

      window.setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          window.showSection('login');
        } else {
          location.assign('/login.html');
        }
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'خطأ في التحقق');
  }
};

export const logout = async () => { 
  try {
    const res = await axios({ method: 'GET', url: '/api/v1/users/logout' });
    if (res.data.status === 'success') {
      
      try {
        await localforage.removeItem('offline_bookmarks');
        await localforage.removeItem('latest_khatmah');
        await localforage.removeItem('khatmah_meta');
        await localforage.removeItem('offline_actions_queue');
      } catch (cacheErr) {
        console.warn('⚠️ خطأ في مسح الكاش أثناء الخروج:', cacheErr);
      }

      // 🌟 مسح بيانات الهوية والتوكن
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key: 'auth_token' });
      } else {
        localStorage.removeItem('auth_token');
      }
      
      localStorage.removeItem('userId'); // مسح معرف المستخدم
      localStorage.removeItem('user');
      localStorage.removeItem('name');

      delete axios.defaults.headers.common['Authorization'];
      
      if (Capacitor.isNativePlatform()) {
        window.checkAuth();
        window.showSection('login');
      } else {
        location.assign('/login.html');
      }
    }
  } catch (err) {
    showAlert('error', 'خطأ في الخروج');
  }
};

export const updateSettings = async (data, type) => {
  const url = type === "password" ? "/api/v1/users/updatePassword" : "/api/v1/users/updateMe";
  try {
    const res = await axios({ method: "PATCH", url, data });
    if (res.data.status === "success") {
        
      // 🔥 الإضافة الجديدة: تحديث الاسم في الذاكرة لو المستخدم عدل بياناته الشخصية 🔥
      const user = res.data.data?.user || res.data.user;
      if (user && type !== 'password') {
        localStorage.setItem('user', JSON.stringify(user));
        if (user.name) localStorage.setItem('name', user.name);
      }

      showAlert("success", "تم التحديث بنجاح");
      window.setTimeout(() => location.reload(), 1000);
    }
  } catch (err) {
    showAlert("error", err.response?.data?.message || 'خطأ في التحديث');
  }
};

export const changePassword = async (currentPassword, newPassword, newPasswordConfirm) => {
  if (!currentPassword || !newPassword || !newPasswordConfirm) {
    showAlert('error', 'يرجى ملء جميع الحقول');
    return;
  }
  if (newPassword !== newPasswordConfirm) {
    showAlert('error', 'كلمة المرور الجديدة وتأكيدها غير متطابقتين');
    return;
  }
  if (newPassword.length < 8) {
    showAlert('error', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    return;
  }
  try {
    const res = await axios({
      method: 'PATCH',
      url: '/api/v1/users/updatePassword',
      data: { passwordCurrent: currentPassword, password: newPassword, passwordConfirm: newPasswordConfirm }
    });
    if (res.data.status === 'success') {
      showAlert('success', 'تم تغيير كلمة المرور بنجاح ✅');
      if (res.data.token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: 'auth_token', value: res.data.token });
  } else {
    localStorage.setItem('auth_token', res.data.token);
  }
}
      const fields = ['current-password', 'new-password', 'confirm-new-password'];
      fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'خطأ في تغيير كلمة المرور');
  }
};

export const forgotPassword = async (email) => {
  if (!email) {
    showAlert('error', 'يرجى إدخال البريد الإلكتروني');
    return;
  }
  try {
    const btn = document.getElementById('forgot-password-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> جاري الإرسال...'; }

    const res = await axios({ method: 'POST', url: '/api/v1/users/forgetPassword', data: { email } });
    if (res.data.status === 'success') {
      showAlert('success', 'تم إرسال كود التحقق إلى بريدك الإلكتروني!');

      // حفظ الإيميل مؤقتاً للخطوة التالية
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: 'reset_email', value: email });
      } else {
        sessionStorage.setItem('reset_email', email);
      }

      const msgEl = document.getElementById('forgot-success-msg');
      if (msgEl) {
        msgEl.classList.remove('d-none');
        msgEl.innerText = `تم إرسال كود التحقق إلى: ${email}`;
      }

      // الانتقال لصفحة إدخال الـ OTP وكلمة المرور الجديدة
      window.setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          window.showSection('reset-password');
        } else {
          location.assign('/reset-password.html');
        }
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'خطأ في إرسال البريد، تحقق من البريد الإلكتروني');
  } finally {
    const btn = document.getElementById('forgot-password-btn');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> إرسال كود التحقق'; }
  }
};

export const resetPassword = async (otp, password, passwordConfirm) => {
  try {
    // استرجاع الإيميل المحفوظ
    let email;
    if (Capacitor.isNativePlatform()) {
      const stored = await Preferences.get({ key: 'reset_email' });
      email = stored.value;
    } else {
      email = sessionStorage.getItem('reset_email');
    }

    if (!email) {
      showAlert('error', 'انتهت الجلسة، يرجى طلب كود جديد');
      return;
    }

    const res = await axios({
      method: 'PATCH',
      url: '/api/v1/users/resetPassword',
      data: { email, otp, password, passwordConfirm }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'تم تغيير كلمة المرور بنجاح وتسجيل الدخول!');

      const newToken = res.data.token;
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: 'auth_token', value: newToken });
        await Preferences.remove({ key: 'reset_email' });
      } else {
        localStorage.setItem('auth_token', newToken);
        sessionStorage.removeItem('reset_email');
      }

      window.setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          window.checkAuth();
          window.showSection('home');
        } else {
          location.assign('/');
        }
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'الكود غير صحيح أو منتهي الصلاحية');
  }
};

export const deleteUser = async (id) => {
  try {
    const res = await axios({ method: 'DELETE', url: `/api/v1/users/${id}` });
    if (res.status === 204) {
      showAlert('success', 'تم حذف المستخدم بنجاح');
      window.setTimeout(() => location.reload(), 1000);
    }
  } catch (err) {
    showAlert('error', 'فشل الحذف! تأكد أنك تمتلك صلاحية الأدمن.');
  }
};




export const deleteUserForuser = async () => {
  const result = await Swal.fire({
    title: 'هل أنت متأكد؟',
    text: "سيتم تعطيل حسابك ومسح بياناتك الشخصية المرتبطة به من هذا الجهاز.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'نعم، احذف حسابي',
    cancelButtonText: 'إلغاء'
  });

  if (result.isConfirmed) {
    try {
      Swal.fire({
        title: 'جاري حذف الحساب...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });


      const res = await axios.delete('/api/v1/users/deleteMe');

      if (res.status === 204 || (res.data && res.data.status === 'success')) {
        
        try {
          await localforage.removeItem('offline_bookmarks');
          await localforage.removeItem('latest_khatmah');
          await localforage.removeItem('khatmah_meta');
          await localforage.removeItem('offline_actions_queue');
        } catch (cacheErr) {
          console.warn('⚠️ خطأ في مسح الكاش أثناء حذف الحساب:', cacheErr);
        }

        if (Capacitor.isNativePlatform()) {
          await Preferences.remove({ key: 'auth_token' });
        } else {
          localStorage.removeItem('auth_token');
        }
        delete axios.defaults.headers.common['Authorization'];

        Swal.fire(
          'تم الحذف!',
          'تم تعطيل حسابك بنجاح، نتمنى رؤيتك مجدداً.',
          'success'
        ).then(() => {
          if (Capacitor.isNativePlatform()) {
            window.checkAuth(); // تحديث حالة الواجهة
            window.showSection('login');
          } else {
           location.assign('/login.html');
          }
        });
      }
    } catch (err) {
      Swal.fire(
        'خطأ!',
        err.response?.data?.message || 'حدث خطأ أثناء محاولة حذف الحساب، حاول مرة أخرى.',
        'error'
      );
    }
  }
};
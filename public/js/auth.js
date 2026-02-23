import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const showAlert = (type, msg) => {
  const markup = `<div class="alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow" role="alert" style="z-index: 9999;">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
  document.body.insertAdjacentHTML('afterbegin', markup);
  window.setTimeout(() => { const alert = document.querySelector('.alert'); if (alert) alert.remove(); }, 3000);
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
        // ✅ في الـ web، احفظه في localStorage
        localStorage.setItem('auth_token', token);
      }
    }

    if (res.data.status === 'success') {
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
    showAlert('error', err.response?.data?.message || 'خطأ في تسجيل الدخول');
  }
};

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    const res = await axios({ method: 'POST', url: '/api/v1/users/signup', data: { name, email, password, passwordConfirm } });
    if (res.data.status === 'success') {
      showAlert('success', 'تم إنشاء الحساب! تفقد بريدك لتفعيل الحساب.');
      window.setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          const emailInput = document.getElementById('verify-email');
          if (emailInput) emailInput.value = email;
          window.showSection('verify-otp');
        } else {
          location.assign('/VerifyOTP');
        }
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'خطأ في إنشاء الحساب');
  }
};

export const verifyOTP = async (email, otp) => {
  try {
    const res = await axios({ method: 'POST', url: '/api/v1/users/verifyOTP', data: { email, otp } });
    if (res.data.status === 'success') {
      showAlert('success', 'تم التفعيل!');
      window.setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          window.showSection('login');
        } else {
          location.assign('/login');
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
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key: 'auth_token' });
      } else {
        localStorage.removeItem('auth_token');
      }
      delete axios.defaults.headers.common['Authorization'];
      
      if (Capacitor.isNativePlatform()) {
        window.checkAuth();
        window.showSection('login');
      } else {
        location.assign('/login');
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
      showAlert('success', 'تم إرسال رابط الاستعادة إلى بريدك الإلكتروني! تحقق من صندوق الوارد.');
      // إظهار رسالة النجاح في الصفحة
      const msgEl = document.getElementById('forgot-success-msg');
      if (msgEl) {
        msgEl.classList.remove('d-none');
        msgEl.innerText = `تم إرسال رابط إعادة التعيين إلى: ${email}`;
      }
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'خطأ في إرسال البريد، تحقق من البريد الإلكتروني');
  } finally {
    const btn = document.getElementById('forgot-password-btn');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> إرسال رابط الاستعادة'; }
  }
};

export const resetPassword = async (token, password, passwordConfirm) => {
  try {
    const res = await axios({ method: 'PATCH', url: `/api/v1/users/resetPassword/${token}`, data: { password, passwordConfirm } });
    if (res.data.status === 'success') {
      showAlert('success', 'تم تغيير كلمة المرور بنجاح!');
      window.setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          window.showSection('login');
          window.checkAuth();
        } else {
          location.assign('/login');
        }
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'خطأ في إعادة التعيين');
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
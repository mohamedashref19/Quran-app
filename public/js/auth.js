import axios from 'axios';
import { Capacitor } from '@capacitor/core';

export const showAlert = (type, msg) => {
  const markup = `<div class="alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow" role="alert" style="z-index: 9999;">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
  document.body.insertAdjacentHTML('afterbegin', markup);
  window.setTimeout(() => { const alert = document.querySelector('.alert'); if (alert) alert.remove(); }, 3000);
};

export const login = async (email, password) => {
  try {
    const res = await axios({ method: 'POST', url: '/api/v1/users/login', data: { email, password } });
    if (res.data.status === 'success') {
      showAlert('success', 'تم تسجيل الدخول بنجاح!');
      window.setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
            window.showSection('home');
            window.checkAuth();
        } else { location.assign('/'); }
      }, 1000);
    }
  } catch (err) { showAlert('error', err.response.data.message); }
};

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    const res = await axios({ method: 'POST', url: '/api/v1/users/signup', data: { name, email, password, passwordConfirm } });

    if (res.data.status === 'success') {
      showAlert('success', 'تم إنشاء الحساب! تفقد بريدك لتفعيل الحساب.');
      window.setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
             const emailInput = document.getElementById('verify-email');
             if(emailInput) emailInput.value = email;
             window.showSection('verify-otp'); 
        } else {
             location.assign('/VerifyOTP');
        }
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
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
        } else { location.assign('/login'); }
      }, 1500);
    }
  } catch (err) { showAlert('error', err.response.data.message); }
};

export const logout = async () => {
  try {
    const res = await axios({ method: 'GET', url: '/api/v1/users/logout' });
    if (res.data.status === 'success') {
      if (Capacitor.isNativePlatform()) {
          window.showSection('login');
          window.checkAuth(); // تحديث النافبار
      } else { location.assign('/login'); }
    }
  } catch (err) { showAlert('error', 'خطأ في الخروج'); }
};

export const updateSettings = async (data, type) => {
  const url = type === "password" ? "/api/v1/users/updatePassword" : "/api/v1/users/updateMe";
  try {
    const res = await axios({
      method: "PATCH",
      url,
      data,
    });
    if (res.data.status === "success") {
      showAlert("success", `${type.toUpperCase()} Updated Successfully`);
      window.setTimeout(() => {
        location.reload(); // Reload شغال تمام في الحالتين هنا
      }, 1000);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

export const forgotPassword = async (email) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/forgetPassword',
      data: { email }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'تم إرسال رابط الاستعادة إلى بريدك الإلكتروني!');
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const resetPassword = async (token, password, passwordConfirm) => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: `/api/v1/users/resetPassword/${token}`,
      data: { password, passwordConfirm }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'تم تغيير كلمة المرور بنجاح!');
      window.setTimeout(() => {
         if (Capacitor.isNativePlatform()) {
          window.showSection('login');
          window.checkAuth(); 
      } else { location.assign('/login'); }
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const deleteUser = async (id) => {
  try {
    const res = await axios({
      method: 'DELETE',
      url: `/api/v1/users/${id}`
    });
    
    if (res.status === 204) {
      showAlert('success', 'تم حذف المستخدم بنجاح');
      window.setTimeout(() => {
        location.reload();
      }, 1000);
    }
  } catch (err) {
    showAlert('error', 'فشل الحذف! تأكد أنك تمتلك صلاحية الأدمن.');
  }
};
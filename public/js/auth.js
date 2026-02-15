/* eslint-disable */
import axios from 'axios';

export const showAlert = (type, msg) => {
  const markup = `<div class="alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow" role="alert" style="z-index: 9999;">
    ${msg}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  </div>`;
  
  document.body.insertAdjacentHTML('afterbegin', markup);
  
  window.setTimeout(() => {
    const alert = document.querySelector('.alert');
    if (alert) alert.remove();
  }, 3000);
};

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: { email, password }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'تم تسجيل الدخول بنجاح!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/signup',
      data: { name, email, password, passwordConfirm }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'تم إنشاء الحساب! تفقد بريدك لتفعيل الحساب.');
      window.setTimeout(() => {
        location.assign('/VerifyOTP');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const verifyOTP = async (email, otp) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/verifyOTP',
      data: { email, otp }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'تم تفعيل الحساب بنجاح!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout'
    });
    
    if (res.data.status === 'success') {
      
     location.assign('/');
    }
  } catch (err) {
    showAlert('error', 'خطأ في تسجيل الخروج، حاول مرة أخرى.');
  }
};

export const updateSettings = async (data, type) => {
  const url =
    type === "password"
      ? "/api/v1/users/updatePassword"
      : "/api/v1/users/updateMe";
  try {
    const res = await axios({
      method: "PATCH",
      url,
      data,
    });
    console.log(res);
    if (res.data.status === "success") {
      showAlert("success", `${type.toUpperCase()} Update Successfuly`);
      window.setTimeout(() => {
        location.reload();
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
        location.assign('/'); 
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
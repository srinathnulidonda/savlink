// src/utils/toast.js
import { toast as hotToast } from 'react-hot-toast';

export const toast = {
    success: (message) => {
        hotToast.success(message, {
            duration: 4000,
            style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #374151'
            },
        });
    },
    error: (message) => {
        hotToast.error(message, {
            duration: 5000,
            style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #374151'
            },
        });
    },
    info: (message) => {
        hotToast(message, {
            duration: 4000,
            style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #374151'
            },
        });
    },
    loading: (message) => {
        return hotToast.loading(message, {
            style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #374151'
            },
        });
    },
    dismiss: (toastId) => {
        hotToast.dismiss(toastId);
    }
};

export default toast;
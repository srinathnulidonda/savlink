// src/pages/dashboard/settings/Account.jsx
export default function Account() {
    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold text-white mb-6">Account Settings</h1>

            <div className="space-y-6">
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                    <h2 className="text-lg font-medium text-white mb-4">Danger Zone</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    );
}
// src/components/dashboard/sidebar/StorageWidget.jsx
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function StorageWidget({ stats }) {
    const [storageData, setStorageData] = useState({
        used: 2.3,
        total: 10,
        links: stats.all || 0
    });

    const storagePercentage = (storageData.used / storageData.total) * 100;
    const isNearLimit = storagePercentage > 80;

    const getStorageColor = () => {
        if (storagePercentage > 90) return 'text-red-400';
        if (storagePercentage > 80) return 'text-yellow-400';
        return 'text-green-400';
    };

    const getStorageBarColor = () => {
        if (storagePercentage > 90) return 'bg-red-500';
        if (storagePercentage > 80) return 'bg-yellow-500';
        return 'bg-primary';
    };

    return (
        <div className="border-t border-gray-900 p-3 lg:p-4">
            <div className="space-y-3">
                {/* Storage Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] lg:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Storage
                    </h3>
                    {isNearLimit && (
                        <span className="text-[10px] text-yellow-400 animate-pulse">
                            ⚠️
                        </span>
                    )}
                </div>

                {/* Storage Bar */}
                <div className="space-y-2">
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${storagePercentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full ${getStorageBarColor()} rounded-full relative`}
                        >
                            {storagePercentage > 70 && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 rounded-full"></div>
                            )}
                        </motion.div>
                    </div>

                    {/* Storage Text */}
                    <div className="flex items-center justify-between text-[10px] lg:text-xs">
                        <span className="text-gray-500">
                            {storageData.used}GB used
                        </span>
                        <span className={`font-mono ${getStorageColor()}`}>
                            {storageData.total - storageData.used}GB free
                        </span>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 text-[10px] lg:text-xs">
                    <div className="text-center p-2 bg-gray-900/50 rounded-lg">
                        <div className="text-white font-semibold">{storageData.links}</div>
                        <div className="text-gray-500">Links</div>
                    </div>
                    <div className="text-center p-2 bg-gray-900/50 rounded-lg">
                        <div className="text-white font-semibold">{Math.round(storagePercentage)}%</div>
                        <div className="text-gray-500">Used</div>
                    </div>
                </div>

                {/* Upgrade Prompt */}
                {isNearLimit && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-2"
                    >
                        <p className="text-[10px] text-yellow-400 mb-2">Storage almost full</p>
                        <button className="w-full text-[10px] bg-yellow-500 hover:bg-yellow-400 text-black font-medium py-1 px-2 rounded transition-colors">
                            Upgrade Plan
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
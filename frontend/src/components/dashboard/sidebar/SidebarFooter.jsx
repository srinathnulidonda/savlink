// src/components/dashboard/sidebar/SidebarFooterMinimal.jsx
import { Link } from 'react-router-dom';

export default function SidebarFooterMinimal() {
    return (
        <div className="border-t border-gray-900 p-2 lg:p-2.5 mt-auto">
            <div className="space-y-1">
                {/* Legal Links */}
                <div className="flex items-center justify-center gap-2">
                    <Link
                        to="/terms"
                        className="text-[9px] lg:text-[10px] text-gray-500 hover:text-gray-400 transition-colors"
                    >
                        Terms of Use
                    </Link>
                    <span className="text-gray-700 text-[9px] lg:text-[10px]">•</span>
                    <Link
                        to="/privacy"
                        className="text-[9px] lg:text-[10px] text-gray-500 hover:text-gray-400 transition-colors"
                    >
                        Privacy Policy
                    </Link>
                </div>

                {/* Copyright */}
                <div className="text-center">
                    <div className="text-[9px] lg:text-[10px] text-gray-600">
                        © {new Date().getFullYear()} Savlink
                    </div>
                </div>
            </div>
        </div>
    );
}
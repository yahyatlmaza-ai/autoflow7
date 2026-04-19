import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function WhatsAppButton() {
  const [open, setOpen] = useState(false);
  const { platformSettings } = useApp();
  const waNumber = platformSettings?.support_whatsapp || '213794157508';

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl shadow-black/20 border border-gray-200 dark:border-gray-700 p-5 w-72"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">Support Team</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Online now</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Hi! How can we help you today? Start a conversation on WhatsApp.
            </p>
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors text-sm">
              <MessageCircle className="w-4 h-4" />
              Start Chat
            </a>
            <a href={`tel:+${waNumber}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm">
              <Phone className="w-4 h-4" />
              Call Us
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(!open)}
        className="relative w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl shadow-green-500/40 flex items-center justify-center transition-colors"
      >
        {!open && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-950">
            <span className="text-white text-[9px] font-black">1</span>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          <motion.div key={open ? 'x' : 'msg'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
            {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

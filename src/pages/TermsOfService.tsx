import { motion } from 'motion/react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">Terms of Service</h1>
            <p className="text-zinc-500 font-medium">Last updated: April 13, 2026</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-zinc-400">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">1. Acceptance of Terms</h2>
              <p>
                By accessing and using FlixLab, you accept and agree to be bound by the terms and provision 
                of this agreement.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">2. Use License</h2>
              <p>
                Permission is granted to temporarily access the materials (information or software) on 
                FlixLab's website for personal, non-commercial transitory viewing only.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">3. Disclaimer</h2>
              <p>
                The materials on FlixLab's website are provided on an 'as is' basis. FlixLab makes no 
                warranties, expressed or implied, and hereby disclaims and negates all other warranties 
                including, without limitation, implied warranties or conditions of merchantability, 
                fitness for a particular purpose, or non-infringement of intellectual property or other 
                violation of rights.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">4. Limitations</h2>
              <p>
                In no event shall FlixLab or its suppliers be liable for any damages (including, without 
                limitation, damages for loss of data or profit, or due to business interruption) arising 
                out of the use or inability to use the materials on FlixLab's website.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

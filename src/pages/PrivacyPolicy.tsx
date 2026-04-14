import { motion } from 'motion/react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">Privacy Policy</h1>
            <p className="text-zinc-500 font-medium">Last updated: April 13, 2026</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-zinc-400">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">1. Introduction</h2>
              <p>
                Welcome to FlixLab. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy will inform you about how we look after your personal data when you visit our 
                website and tell you about your privacy rights.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">2. Data We Collect</h2>
              <p>
                We may collect, use, store and transfer different kinds of personal data about you which we have 
                grouped together as follows:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                <li><strong>Contact Data:</strong> includes email address.</li>
                <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
                <li><strong>Usage Data:</strong> includes information about how you use our website and services.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">3. How We Use Your Data</h2>
              <p>
                We will only use your personal data when the law allows us to. Most commonly, we will use your 
                personal data in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>To provide and maintain our Service.</li>
                <li>To notify you about changes to our Service.</li>
                <li>To provide customer support.</li>
                <li>To gather analysis or valuable information so that we can improve our Service.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white">4. Data Security</h2>
              <p>
                We have put in place appropriate security measures to prevent your personal data from being 
                accidentally lost, used or accessed in an unauthorized way, altered or disclosed.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

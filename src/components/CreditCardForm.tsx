import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface CreditCardFormProps {
  amount: number;
  onSuccess: (transactionId: string) => void;
  onCancel: () => void;
}

export default function CreditCardForm({ amount, onSuccess, onCancel }: CreditCardFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: ''
  });

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) return parts.join(' ');
    return value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payment Successful!');
        onSuccess(data.transactionId);
      } else {
        toast.error(data.message || 'Payment failed');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-white">NeoPay Gateway</h3>
        </div>
        <div className="flex items-center gap-1 text-zinc-500 text-xs font-bold uppercase tracking-widest">
          <Lock className="w-3 h-3" />
          Secure
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-500 uppercase">Cardholder Name</label>
          <Input 
            placeholder="John Doe"
            className="bg-zinc-800 border-zinc-700 h-12"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-500 uppercase">Card Number</label>
          <Input 
            placeholder="0000 0000 0000 0000"
            className="bg-zinc-800 border-zinc-700 h-12"
            value={formData.cardNumber}
            onChange={e => setFormData({...formData, cardNumber: formatCardNumber(e.target.value)})}
            maxLength={19}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase">Expiry Date</label>
            <Input 
              placeholder="MM/YY"
              className="bg-zinc-800 border-zinc-700 h-12"
              value={formData.expiry}
              onChange={e => setFormData({...formData, expiry: e.target.value})}
              maxLength={5}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase">CVC</label>
            <Input 
              placeholder="123"
              type="password"
              className="bg-zinc-800 border-zinc-700 h-12"
              value={formData.cvc}
              onChange={e => setFormData({...formData, cvc: e.target.value})}
              maxLength={3}
              required
            />
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <Button 
            type="submit" 
            className="w-full bg-red-600 hover:bg-red-700 h-14 text-lg font-bold rounded-2xl"
            disabled={loading}
          >
            {loading ? 'Processing...' : `Pay $${amount}.00`}
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full text-zinc-500 hover:text-white"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-zinc-600 text-[10px] uppercase font-bold tracking-tighter">
          <ShieldCheck className="w-3 h-3" />
          PCI-DSS Compliant Encryption
        </div>
      </form>
    </motion.div>
  );
}

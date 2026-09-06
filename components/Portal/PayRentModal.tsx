interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  propertyName?: string;
  onSuccess: () => void;
}
export default function PayRentModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="payment-unavailable" className="card">
      <h2 id="payment-unavailable">Online payments unavailable</h2>
      <p>Contact management for payment instructions. No payment has been collected.</p>
      <button type="button" onClick={onClose}>Close</button>
    </div>
  );
}

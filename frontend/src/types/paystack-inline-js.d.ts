declare module "@paystack/inline-js" {
  type PaystackCallback = (response: { reference: string; trans?: string; status?: string }) => void;

  type NewTransactionOptions = {
    key: string;
    email: string;
    amount: number;
    reference?: string;
    access_code?: string;
    onSuccess?: PaystackCallback;
    onCancel?: () => void;
  };

  export default class PaystackPop {
    newTransaction(options: NewTransactionOptions): void;
    resumeTransaction(accessCode: string, options?: { onSuccess?: PaystackCallback; onCancel?: () => void }): void;
  }
}

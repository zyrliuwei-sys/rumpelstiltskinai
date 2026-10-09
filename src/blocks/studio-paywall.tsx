import { m } from '@/paraglide/messages.js';
import { Pricing } from '@/blocks/pricing';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function StudioPaywall({
  open,
  onOpenChange,
  cost,
  balance,
  redirect,
  cancelRedirect,
  beforeCheckout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cost: number;
  balance: number;
  redirect: string;
  cancelRedirect: string;
  beforeCheckout: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto p-5 sm:max-w-5xl sm:p-8">
        <DialogHeader className="px-6 text-center">
          <DialogTitle className="text-xl">
            {m['rumpel.studio.paywallTitle']()}
          </DialogTitle>
          <DialogDescription>
            {m['rumpel.studio.paywallDescription']({ cost, balance })}
          </DialogDescription>
          <p className="text-muted-foreground text-xs">
            {m['rumpel.studio.paywallSaved']()}
          </p>
        </DialogHeader>
        <Pricing
          variant="dialog"
          redirect={redirect}
          cancelRedirect={cancelRedirect}
          beforeCheckout={beforeCheckout}
        />
      </DialogContent>
    </Dialog>
  );
}

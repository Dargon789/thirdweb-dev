import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { ConnectButton, ThirdwebProvider } from "thirdweb/react";
import {
  BadgeContainer,
  storybookLog,
  storybookThirdwebClient,
<<<<<<< HEAD:apps/dashboard/src/app/nebula-app/(app)/components/ExecuteTransactionCard.stories.tsx
} from "stories/utils";
import { ConnectButton, ThirdwebProvider } from "thirdweb/react";
=======
} from "@/storybook/utils";
>>>>>>> upstream/main:apps/nebula/src/app/(app)/components/ExecuteTransactionCard.stories.tsx
import { ExecuteTransactionCardLayout } from "./ExecuteTransactionCard";
import type { TxStatus } from "./Swap/common";

const meta = {
<<<<<<< HEAD:apps/dashboard/src/app/nebula-app/(app)/components/ExecuteTransactionCard.stories.tsx
  title: "Nebula/actions/ExecuteTransactionCard",
=======
>>>>>>> upstream/main:apps/nebula/src/app/(app)/components/ExecuteTransactionCard.stories.tsx
  component: Story,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  title: "Nebula/actions/ExecuteTransactionCard",
} satisfies Meta<typeof Story>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  args: {},
};

const exampleTxHash =
  "0xbe81f5a6421625052214b41bb79d1d82751b29aa5639b54d120f00531bb8bcf";

function Story() {
  return (
    <ThirdwebProvider>
      <div className="container flex max-w-[800px] flex-col gap-10 py-10">
        <div>
          <ConnectButton client={storybookThirdwebClient} />
        </div>
        <Variant label="Idle" status={{ type: "idle" }} />
        <Variant label="Sending" status={{ type: "sending" }} />
        <Variant
          label="Confirming"
          status={{ txHash: exampleTxHash, type: "confirming" }}
        />
        <Variant
          label="Confirmed"
          status={{ txHash: exampleTxHash, type: "confirmed" }}
        />
        <Variant
          label="Failed"
          status={{ txHash: exampleTxHash, type: "failed" }}
        />
      </div>
    </ThirdwebProvider>
  );
}

function Variant(props: { label: string; status: TxStatus }) {
  const [status, setStatus] = useState<TxStatus>(props.status);
  return (
    <BadgeContainer label={props.label}>
      <ExecuteTransactionCardLayout
        client={storybookThirdwebClient}
        onTxSettled={(txHash) => {
          storybookLog(`onTxSettled called with ${txHash}`);
        }}
        sendTx={async () => {}}
        setStatus={setStatus}
        status={status}
        txData={{
          chainId: 1,
          data: "0x", // thirdweb.eth
          to: "0xEb0effdFB4dC5b3d5d3aC6ce29F3ED213E95d675",
          value: "0x16345785d8a0000", // 0.1 eth
        }}
      />
    </BadgeContainer>
  );
}

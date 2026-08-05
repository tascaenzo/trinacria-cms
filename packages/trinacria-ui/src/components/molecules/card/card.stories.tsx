import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { Card, CardActions, CardContent, CardHeader, CardHeading } from "./card.js";

const meta = { title: "Layout/Surface/Card", component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Composition: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Card padding="none">
        <CardHeader>
          <CardHeading
            icon="package"
            title="Plugin catalog"
            description="Snapshot operativo del runtime plugin."
          />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            12 plugin registrati, 11 healthy, 1 degraded.
          </p>
        </CardContent>
        <CardActions>
          <Button variant="ghost">Annulla</Button>
          <Button>Apri dettaglio</Button>
        </CardActions>
      </Card>
    </div>
  )
};

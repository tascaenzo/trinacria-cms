import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { Card, CardActions, CardContent, CardDescription, CardHeader, CardTitle } from "./card.js";

const meta = { title: "Layout/Surface/Card", component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Composition: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Plugin catalog</CardTitle>
          <CardDescription>Snapshot operativo del runtime plugin.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[color:var(--color-ink-muted)]">12 plugin registrati, 11 healthy, 1 degraded.</p>
        </CardContent>
        <CardActions>
          <Button variant="ghost">Annulla</Button>
          <Button>Apri dettaglio</Button>
        </CardActions>
      </Card>
    </div>
  )
};

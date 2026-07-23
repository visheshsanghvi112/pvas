import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function FilterPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Filters</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4">
        <Input placeholder="Sector" />
        <Input placeholder="Risk score > 70" />
        <Input placeholder="Volume Z > 3" />
        <Button>Apply Filters</Button>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-36 flex-col justify-center p-5">
        <Badge variant="secondary" className="w-fit">
          Coming Soon
        </Badge>
        <h3 className="mt-3 font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

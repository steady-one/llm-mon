import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ModelUsage {
  model: string
  requests: number
  tokens: number
  cost: number
}

interface TopModelsTableProps {
  models: ModelUsage[]
}

export function TopModelsTable({ models }: TopModelsTableProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Model</TableHead>
          <TableHead className="text-right">Requests</TableHead>
          <TableHead className="text-right">Tokens</TableHead>
          <TableHead className="text-right">Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {models.map((model) => (
          <TableRow key={model.model}>
            <TableCell className="font-medium">{model.model}</TableCell>
            <TableCell className="text-right">{formatNumber(model.requests)}</TableCell>
            <TableCell className="text-right">{formatNumber(model.tokens)}</TableCell>
            <TableCell className="text-right">${model.cost.toFixed(2)}</TableCell>
          </TableRow>
        ))}
        {models.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-gray-500">
              No data available
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

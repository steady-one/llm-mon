"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"

interface MonitorToken {
  id: string
  tokenPrefix: string
  name: string | null
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<MonitorToken[]>([])
  const [newTokenName, setNewTokenName] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)

  useEffect(() => {
    fetchTokens()
  }, [])

  async function fetchTokens() {
    try {
      const response = await fetch("/api/tokens")
      const data = await response.json()
      setTokens(data.tokens || [])
    } catch (error) {
      console.error("Failed to fetch tokens:", error)
    } finally {
      setLoading(false)
    }
  }

  async function createToken() {
    if (!newTokenName.trim()) return

    setCreating(true)
    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTokenName }),
      })

      const data = await response.json()

      if (response.ok) {
        setNewToken(data.token)
        setNewTokenName("")
        fetchTokens()
      }
    } catch (error) {
      console.error("Failed to create token:", error)
    } finally {
      setCreating(false)
    }
  }

  async function deleteToken(tokenId: string) {
    if (!confirm("Are you sure you want to delete this token?")) return

    try {
      const response = await fetch(`/api/tokens?id=${tokenId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchTokens()
      }
    } catch (error) {
      console.error("Failed to delete token:", error)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">API Tokens</h1>
        <p className="text-gray-600">Manage your monitor tokens</p>
      </div>

      {/* Create New Token */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Token</CardTitle>
          <CardDescription>
            Create a new monitor token to track API usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="tokenName" className="sr-only">
                Token Name
              </Label>
              <Input
                id="tokenName"
                placeholder="Token name (e.g., Production, Development)"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
              />
            </div>
            <Button onClick={createToken} disabled={creating || !newTokenName.trim()}>
              {creating ? "Creating..." : "Create Token"}
            </Button>
          </div>

          {newToken && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-medium mb-2">
                Token created! Copy it now - it won&apos;t be shown again.
              </p>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-white rounded border font-mono text-sm break-all">
                  {newToken}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(newToken)
                  }}
                >
                  Copy
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setNewToken(null)}
              >
                Dismiss
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Set Environment Variables</h4>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
{`# Keep your existing OpenAI API key
OPENAI_API_KEY=sk-your-key

# Change the base URL to our proxy
OPENAI_BASE_URL=http://localhost:3000/api/v1/openai

# Add your monitor token
LLM_MONITOR_TOKEN=mon_xxx...`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. Add Monitor Token Header</h4>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
{`curl -X POST http://localhost:3000/api/v1/openai/chat/completions \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -H "X-Monitor-Token: $LLM_MONITOR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hi"}]}'`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-4">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Token Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="font-medium">
                      {token.name || "Unnamed"}
                    </TableCell>
                    <TableCell>
                      <code className="text-sm">{token.tokenPrefix}...</code>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          token.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {token.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {token.lastUsedAt
                        ? format(new Date(token.lastUsedAt), "MMM d, yyyy HH:mm")
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(token.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteToken(token.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {tokens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No tokens found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

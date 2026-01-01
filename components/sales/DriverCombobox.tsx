"use client"
import * as React from "react"
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Plus, ChevronsUpDown } from "lucide-react"

interface DriverOption {
  name: string
  phone: string
}

interface DriverComboboxProps {
  options: DriverOption[]
  value: DriverOption | null
  onChange: (option: DriverOption | null) => void
  onCreate: (fields: { name: string; phone: string }) => Promise<DriverOption>
  loading?: boolean
}

export function DriverCombobox({ options, value, onChange, onCreate, loading }: DriverComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState("")
  const [creating, setCreating] = React.useState(false)

  const filtered = input
    ? options.filter(o =>
        (o.name?.toLowerCase() || "").includes(input.toLowerCase()) ||
        o.phone.includes(input)
      )
    : options

  const handleSelect = (option: DriverOption) => {
    onChange(option)
    setOpen(false)
    setInput("")
  }

  const handleCreate = async () => {
    if (!input.trim()) return
    // Parse input: allow "name - phone" or just phone
    let name = ""
    let phone = input.trim()
    if (input.includes("-")) {
      const parts = input.split("-")
      name = parts[0].trim()
      phone = parts.slice(1).join("-").trim()
    }
    setCreating(true)
    try {
      const newOption = await onCreate({ name, phone })
      onChange(newOption)
      setOpen(false)
      setInput("")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? `${value.name ? value.name + " - " : ""}${value.phone}` : input || "Select or type driver..."}
          {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type driver (name - phone)..."
            value={input}
            onValueChange={setInput}
            disabled={loading || creating}
            autoFocus
          />
          <CommandList>
            {filtered.length > 0 ? (
              filtered.map((option, i) => (
                <CommandItem
                  key={i}
                  value={`${option.name ? option.name + " - " : ""}${option.phone}`}
                  onSelect={() => handleSelect(option)}
                >
                  <Check className={"mr-2 h-4 w-4 " + (value?.phone === option.phone && value?.name === option.name ? "opacity-100" : "opacity-0")}/>
                  {option.name ? option.name + " - " : ""}{option.phone}
                </CommandItem>
              ))
            ) : (
              <CommandEmpty>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-center"
                  onClick={handleCreate}
                  disabled={creating || !input.trim()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {creating ? "Adding..." : `Add "${input.trim()}"`}
                </Button>
              </CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 
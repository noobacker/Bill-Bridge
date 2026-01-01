"use client"
import * as React from "react"
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Plus, ChevronsUpDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface Option {
  id: string
  name: string
  phone?: string
  city?: string
  ownerName?: string
}

interface TransportationComboboxProps {
  options: Option[]
  value: Option | null
  onChange: (option: Option | null) => void
  onCreate: (fields: { name: string; phone: string; city: string; ownerName?: string }) => Promise<Option>
  loading?: boolean
}

export function TransportationCombobox({ options, value, onChange, onCreate, loading }: TransportationComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [showModal, setShowModal] = React.useState(false)
  const [modalFields, setModalFields] = React.useState({ name: "", phone: "", city: "", ownerName: "" })
  const [modalError, setModalError] = React.useState("")

  const filtered = input
    ? options.filter(o => o.name.toLowerCase().includes(input.toLowerCase()))
    : options

  const handleSelect = (option: Option) => {
    onChange(option)
    setOpen(false)
    setInput("")
  }

  const handleCreate = () => {
    setModalFields({ name: input.trim(), phone: "", city: "", ownerName: "" })
    setModalError("")
    setShowModal(true)
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalFields.name.trim() || !modalFields.phone.trim() || !modalFields.city.trim()) {
      setModalError("Name, phone, and city are required.")
      return
    }
    setCreating(true)
    try {
      const newOption = await onCreate({
        name: modalFields.name.trim(),
        phone: modalFields.phone.trim(),
        city: modalFields.city.trim(),
        ownerName: modalFields.ownerName.trim() || undefined,
      })
      onChange(newOption)
      setOpen(false)
      setInput("")
      setShowModal(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value ? value.name : input || "Select or type transportation..."}
            {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or type transportation..."
              value={input}
              onValueChange={setInput}
              disabled={loading || creating}
              autoFocus
            />
            <CommandList>
              {filtered.length > 0 ? (
                filtered.map(option => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => handleSelect(option)}
                  >
                    <Check className={"mr-2 h-4 w-4 " + (value?.id === option.id ? "opacity-100" : "opacity-0")}/>
                    {option.name}
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
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transportation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleModalSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Name</label>
              <Input value={modalFields.name} onChange={e => setModalFields(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Phone</label>
              <Input value={modalFields.phone} onChange={e => setModalFields(f => ({ ...f, phone: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">City</label>
              <Input value={modalFields.city} onChange={e => setModalFields(f => ({ ...f, city: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Owner Name (optional)</label>
              <Input value={modalFields.ownerName} onChange={e => setModalFields(f => ({ ...f, ownerName: e.target.value }))} />
            </div>
            {modalError && <div className="text-red-500 text-sm">{modalError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? "Adding..." : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
} 
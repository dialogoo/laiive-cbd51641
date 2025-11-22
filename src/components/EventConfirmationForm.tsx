import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { X, Check } from "lucide-react";

interface EventDetails {
  name: string;
  artist?: string | null;
  description?: string | null;
  event_date: string;
  venue: string;
  city: string;
  price?: number | null;
  ticket_url?: string | null;
}

interface EventConfirmationFormProps {
  eventDetails: EventDetails;
  onConfirm: (details: EventDetails) => void;
  onCancel: () => void;
}

export const EventConfirmationForm = ({
  eventDetails,
  onConfirm,
  onCancel,
}: EventConfirmationFormProps) => {
  const [formData, setFormData] = useState<EventDetails>(eventDetails);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
  };

  const formatDateForInput = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toISOString().slice(0, 16);
    } catch {
      return isoDate;
    }
  };

  return (
    <Card className="p-6 border-border bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold font-montserrat">Confirm Event Details</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4 font-ibm-plex">
        Review and edit the extracted information before creating the event.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Event Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="font-ibm-plex"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="artist">Artist/Band *</Label>
          <Input
            id="artist"
            value={formData.artist || ""}
            onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
            required
            className="font-ibm-plex"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="font-ibm-plex"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="event_date">Date & Time *</Label>
          <Input
            id="event_date"
            type="datetime-local"
            value={formatDateForInput(formData.event_date)}
            onChange={(e) => setFormData({ ...formData, event_date: new Date(e.target.value).toISOString() })}
            required
            className="font-ibm-plex"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="venue">Venue *</Label>
          <Input
            id="venue"
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            required
            className="font-ibm-plex"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
            className="font-ibm-plex"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Ticket Price *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price || ""}
            onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : null })}
            required
            className="font-ibm-plex"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ticket_url">Ticket URL</Label>
          <Input
            id="ticket_url"
            type="url"
            value={formData.ticket_url || ""}
            onChange={(e) => setFormData({ ...formData, ticket_url: e.target.value })}
            className="font-ibm-plex"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1" size="lg">
            <Check className="w-4 h-4 mr-2" />
            Confirm Event
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} size="lg">
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};

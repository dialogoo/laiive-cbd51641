import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

const industryRoles = [
  { value: 'promoter', label: 'Event Promoter' },
  { value: 'venue_manager', label: 'Venue Manager' },
  { value: 'artist_manager', label: 'Artist Manager' },
  { value: 'booking_agent', label: 'Booking Agent' },
  { value: 'musician', label: 'Musician / Band Member' },
  { value: 'other', label: 'Other' },
];

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isPromoter } = useAuth();
  
  // Common fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  
  // Promoter fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [industryRole, setIndustryRole] = useState("");
  const [managedEntity, setManagedEntity] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      setEmail(user.email || "");
      fetchProfile();
      if (isPromoter) {
        fetchPromoterProfile();
      }
    }
  }, [user, authLoading, isPromoter, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      setDisplayName(data?.display_name || "");
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPromoterProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("promoter_profiles")
        .select("first_name, last_name, city, industry_role, managed_entity")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setCity(data.city || "");
        setIndustryRole(data.industry_role || "");
        setManagedEntity(data.managed_entity || "");
      }
    } catch (error) {
      console.error("Error fetching promoter profile:", error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Update basic profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update promoter profile if applicable
      if (isPromoter) {
        if (!firstName || !lastName || !city || !industryRole || !managedEntity) {
          toast.error("Please fill in all professional information");
          setIsSaving(false);
          return;
        }

        const { error: promoterError } = await supabase
          .from("promoter_profiles")
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            city: city.trim(),
            industry_role: industryRole,
            managed_entity: managedEntity.trim(),
          })
          .eq("user_id", user.id);

        if (promoterError) throw promoterError;
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-montserrat font-bold text-lg">Account Settings</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Basic Info Card */}
        <Card className="p-6 space-y-4">
          <h2 className="font-montserrat font-bold text-lg">Basic Information</h2>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              maxLength={100}
            />
          </div>
        </Card>

        {/* Promoter Info Card - Only shown for promoters */}
        {isPromoter && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="font-montserrat font-bold text-lg">Professional Information</h2>
              <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                PRO
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Your city"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industryRole">Industry Role</Label>
              <Select value={industryRole} onValueChange={setIndustryRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {industryRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="managedEntity">Venue / Band / Event Name</Label>
              <Input
                id="managedEntity"
                type="text"
                value={managedEntity}
                onChange={(e) => setManagedEntity(e.target.value)}
                placeholder="Name of venue, band, or event you manage"
                maxLength={200}
              />
            </div>
          </Card>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
};

export default AccountSettings;

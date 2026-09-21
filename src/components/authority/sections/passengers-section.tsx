"use client";

import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Luggage,
  Mail,
  Phone,
  Plane,
  Search,
  Ticket,
  User,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface PassengerRecord {
  id: string;
  fullName: string;
  passportNumber: string;
  nationality: string;
  email: string;
  phone: string;
  loyaltyTier: "STANDARD" | "SILVER" | "GOLD" | "PLATINUM";
  totalFlights: number;
  recentPnr: string;
  recentFlight: string;
  status: "VERIFIED" | "PENDING";
}

const PASSENGERS_DATA: PassengerRecord[] = [
  {
    id: "pax-1",
    fullName: "Capt. Eleanor Vance",
    passportNumber: "Z98172635",
    nationality: "United States",
    email: "eleanor.vance@aero.org",
    phone: "+1 212-555-0182",
    loyaltyTier: "PLATINUM",
    totalFlights: 42,
    recentPnr: "SKY-98234",
    recentFlight: "SKY-402",
    status: "VERIFIED",
  },
  {
    id: "pax-2",
    fullName: "Dr. Marcus Chen",
    passportNumber: "K48291048",
    nationality: "Singapore",
    email: "marcus.chen@med.sg",
    phone: "+65 9123-4567",
    loyaltyTier: "GOLD",
    totalFlights: 28,
    recentPnr: "SKY-54120",
    recentFlight: "SKY-402",
    status: "VERIFIED",
  },
  {
    id: "pax-3",
    fullName: "Sarah Jenkins",
    passportNumber: "U19283746",
    nationality: "United Kingdom",
    email: "s.jenkins@ukops.co.uk",
    phone: "+44 20-7946-0912",
    loyaltyTier: "SILVER",
    totalFlights: 14,
    recentPnr: "SKY-88190",
    recentFlight: "SKY-402",
    status: "VERIFIED",
  },
  {
    id: "pax-4",
    fullName: "David Morales",
    passportNumber: "M92837162",
    nationality: "Spain",
    email: "david.morales@ib.es",
    phone: "+34 91-123-4567",
    loyaltyTier: "STANDARD",
    totalFlights: 6,
    recentPnr: "SKY-33910",
    recentFlight: "SKY-402",
    status: "PENDING",
  },
  {
    id: "pax-5",
    fullName: "Elena Rostova",
    passportNumber: "R73829104",
    nationality: "Germany",
    email: "elena.rostova@tech.de",
    phone: "+49 30-1234567",
    loyaltyTier: "GOLD",
    totalFlights: 31,
    recentPnr: "SKY-29104",
    recentFlight: "SKY-402",
    status: "VERIFIED",
  },
  {
    id: "pax-6",
    fullName: "Alex Thorne",
    passportNumber: "A82719203",
    nationality: "Australia",
    email: "alex.t@syd.au",
    phone: "+61 2-9876-5432",
    loyaltyTier: "SILVER",
    totalFlights: 19,
    recentPnr: "SKY-66291",
    recentFlight: "SKY-402",
    status: "VERIFIED",
  },
];

export function PassengersSection({
  onNavigateTo,
}: {
  onNavigateTo?: (section: string, params?: Record<string, string>) => void;
}) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");

  const filtered = PASSENGERS_DATA.filter((pax) => {
    const matchesSearch =
      pax.fullName.toLowerCase().includes(search.toLowerCase()) ||
      pax.email.toLowerCase().includes(search.toLowerCase()) ||
      pax.passportNumber.toLowerCase().includes(search.toLowerCase()) ||
      pax.recentPnr.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === "ALL" || pax.loyaltyTier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Passenger Manifest & Travel Profiles
          </h2>
          <p className="text-sm text-muted-foreground">
            Search traveler profiles, biometric passport clearance, frequent flyer tiers, and active PNR bookings.
          </p>
        </div>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search passenger by name, passport, email or PNR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm bg-background"
              />
            </div>
            <div>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Loyalty Tiers</option>
                <option value="PLATINUM">Platinum</option>
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="STANDARD">Standard</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Passenger</th>
                <th className="py-2.5 px-3">Passport / ID</th>
                <th className="py-2.5 px-3">Nationality</th>
                <th className="py-2.5 px-3">Loyalty Tier</th>
                <th className="py-2.5 px-3">Recent PNR</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {filtered.map((pax) => (
                <tr key={pax.id} className="hover:bg-muted/30">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      {pax.fullName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {pax.email} &bull; {pax.phone}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-muted-foreground">
                    {pax.passportNumber}
                  </td>
                  <td className="py-2.5 px-3">{pax.nationality}</td>
                  <td className="py-2.5 px-3">
                    <Badge
                      variant={
                        pax.loyaltyTier === "PLATINUM"
                          ? "default"
                          : pax.loyaltyTier === "GOLD"
                          ? "warning"
                          : "outline"
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {pax.loyaltyTier}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-mono font-semibold text-primary">{pax.recentPnr}</div>
                    <div className="text-[11px] text-muted-foreground">{pax.recentFlight}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge
                      variant={pax.status === "VERIFIED" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {pax.status}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => onNavigateTo?.("verification", { pnr: pax.recentPnr })}
                    >
                      Verify Ticket
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

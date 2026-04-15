"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { useBirthData } from "@/lib/context/birth-data-context";
import type { BirthData } from "@/lib/experts/types";

export function BirthDataForm() {
  const router = useRouter();
  const { setBirthData } = useBirthData();
  const [form, setForm] = useState<BirthData>({
    name: "Nigel Lee",
    date: "1991-06-01",
    time: "11:44",
    location: "Manila",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: BirthData = {};
    if (form.name?.trim()) data.name = form.name.trim();
    if (form.date) data.date = form.date;
    if (form.time) data.time = form.time;
    if (form.location?.trim()) data.location = form.location.trim();
    setBirthData(data);
    router.push("/chat");
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel>Date of Birth</FieldLabel>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="[color-scheme:dark]"
            />
          </Field>

          <Field>
            <FieldLabel>
              Time
              <FieldDescription className="inline ml-1">(optional)</FieldDescription>
            </FieldLabel>
            <Input
              type="time"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              className="[color-scheme:dark]"
            />
          </Field>
        </div>

        <Field>
          <FieldLabel>Location</FieldLabel>
          <FieldDescription>City or country of birth</FieldDescription>
          <Input
            placeholder="e.g. Manila, Philippines"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-1">
          <Button type="submit" className="w-full">
            Enter the Council
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/chat")}
            className="w-full text-muted-foreground"
          >
            Skip
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { ArrowLeft, Calendar, Clock, Save } from "lucide-react";
import Link from "next/link";

interface SchedulePageProps {
  params: {
    id: string;
  };
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const SCHEDULE_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekdays (Mon-Fri)" },
  { value: "custom", label: "Custom Days" },
];

export default function SchedulePage({ params }: SchedulePageProps) {
  const [scheduleType, setScheduleType] = useState<"daily" | "weekly" | "custom">("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [releaseTime, setReleaseTime] = useState("09:00");
  const [sectionsPerRelease, setSectionsPerRelease] = useState(1);

  const { data: book } = api.book.getBook.useQuery(
    { bookId: params.id, userId: "" }, // We'll get userId from context
    { enabled: !!params.id }
  );

  const { data: existingSchedule } = api.schedule.getSchedule.useQuery(
    { bookId: params.id },
    { enabled: !!params.id }
  );

  const createScheduleMutation = api.schedule.createSchedule.useMutation({
    onSuccess: () => {
      window.location.href = `/book/${params.id}`;
    },
  });

  const updateScheduleMutation = api.schedule.updateSchedule.useMutation({
    onSuccess: () => {
      window.location.href = `/book/${params.id}`;
    },
  });

  // Load existing schedule data
  useEffect(() => {
    if (existingSchedule) {
      setScheduleType(existingSchedule.scheduleType);
      setDaysOfWeek(existingSchedule.daysOfWeek);
      setReleaseTime(existingSchedule.releaseTime);
      setSectionsPerRelease(existingSchedule.sectionsPerRelease);
    }
  }, [existingSchedule]);

  const handleScheduleTypeChange = (type: "daily" | "weekly" | "custom") => {
    setScheduleType(type);
    
    // Set default days based on schedule type
    switch (type) {
      case "daily":
        setDaysOfWeek([1, 2, 3, 4, 5, 6, 7]);
        break;
      case "weekly":
        setDaysOfWeek([1, 2, 3, 4, 5]);
        break;
      case "custom":
        // Keep current selection
        break;
    }
  };

  const handleDayToggle = (day: number) => {
    setDaysOfWeek(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSave = () => {
    if (daysOfWeek.length === 0) {
      alert("Please select at least one day");
      return;
    }

    const scheduleData = {
      bookId: params.id,
      scheduleType,
      daysOfWeek,
      releaseTime,
      sectionsPerRelease,
    };

    if (existingSchedule) {
      updateScheduleMutation.mutate({
        scheduleId: existingSchedule.id,
        ...scheduleData,
      });
    } else {
      createScheduleMutation.mutate(scheduleData);
    }
  };

  const generatePreview = () => {
    const today = new Date();
    const preview = [];
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
      
      if (daysOfWeek.includes(dayOfWeek)) {
        preview.push({
          date: date.toLocaleDateString(),
          day: DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label,
          time: releaseTime,
        });
      }
    }
    
    return preview;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/book/${params.id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Book
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Release Schedule</h1>
              {book && (
                <p className="text-sm text-gray-600">{book.title}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Schedule Configuration */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule Configuration
                </CardTitle>
                <CardDescription>
                  Set up when and how often you want to receive new sections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Schedule Type */}
                <div className="space-y-2">
                  <Label htmlFor="schedule-type">Schedule Type</Label>
                  <Select value={scheduleType} onValueChange={handleScheduleTypeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Days of Week */}
                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={daysOfWeek.includes(day.value)}
                          onCheckedChange={() => handleDayToggle(day.value)}
                        />
                        <Label htmlFor={`day-${day.value}`} className="text-sm">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Release Time */}
                <div className="space-y-2">
                  <Label htmlFor="release-time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Release Time
                  </Label>
                  <Input
                    id="release-time"
                    type="time"
                    value={releaseTime}
                    onChange={(e) => setReleaseTime(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Sections per Release */}
                <div className="space-y-2">
                  <Label htmlFor="sections-per-release">Sections per Release</Label>
                  <Select 
                    value={sectionsPerRelease.toString()} 
                    onValueChange={(value) => setSectionsPerRelease(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 section</SelectItem>
                      <SelectItem value="2">2 sections</SelectItem>
                      <SelectItem value="3">3 sections</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">
                    How many sections to release at once
                  </p>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {existingSchedule ? "Update Schedule" : "Create Schedule"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Releases</CardTitle>
                <CardDescription>
                  Preview of your next 5 scheduled releases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {generatePreview().map((release, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{release.day}</div>
                        <div className="text-sm text-gray-600">{release.date}</div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {release.time}
                      </div>
                    </div>
                  ))}
                  
                  {generatePreview().length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-8 w-8 mx-auto mb-2" />
                      <p>No releases scheduled</p>
                      <p className="text-sm">Select days to see preview</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>• Releases pause automatically if you have 2+ unread sections</p>
                <p>• You can change your schedule anytime</p>
                <p>• Time is based on your device's timezone</p>
                <p>• Each section is typically 5-15 minutes of reading</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

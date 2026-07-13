import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, Mail, ChevronDown, ChevronUp, Send } from "lucide-react";
import { toast } from "sonner";

export default function Help() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [supportForm, setSupportForm] = useState({
    category: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitTicket = trpc.support.submitTicket.useMutation({
    onSuccess: (result) => {
      toast.success(`Support ticket ${result.id} submitted.`);
      toast.message("Ticket destination", {
        description: "Your message is stored in LARO support tickets and queued for support follow-up.",
      });
      setSupportForm({ category: "", subject: "", message: "" });
      setIsSubmitting(false);
    },
    onError: (err) => {
      toast.error(err.message || "Could not submit ticket");
      setIsSubmitting(false);
    },
  });

  const faqs = [
    {
      question: "How does LARO find lawyers for my case?",
      answer: "LARO uses AI to analyze your case details and match you with lawyers who specialize in your legal area, are located near you, and have the right expertise.",
    },
    {
      question: "How long does it take to get a response from lawyers?",
      answer: "Most lawyers respond within 24-48 hours. LARO sends automated follow-ups to ensure you get timely responses.",
    },
    {
      question: "Is my information secure?",
      answer: "Yes. All data is encrypted and stored securely. We comply with GDPR and Dutch data protection laws.",
    },
    {
      question: "Can I upload evidence from my email or cloud storage?",
      answer: "Yes! LARO can connect to Gmail, Google Drive, OneDrive, Slack, and other platforms to automatically collect relevant evidence.",
    },
    {
      question: "What if I need to clarify something about my case?",
      answer: "On the Home dashboard, use the Input & control chat column, or open the floating assistant from other pages. LARO can ask clarifying questions about your situation.",
    },
  ];

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportForm.category || !supportForm.subject || !supportForm.message) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);
    submitTicket.mutate({
      category: supportForm.category,
      subject: supportForm.subject,
      message: supportForm.message,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Help & Resources
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Find answers to common questions or reach out to our team
          </p>
        </div>

        {/* FAQs - Collapsible */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-orange-500" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <Card
                key={index}
                className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm cursor-pointer hover:border-orange-500/30 transition-all"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <div className="p-4 flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">{faq.question}</h4>
                  {expandedFaq === index ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                {expandedFaq === index && (
                  <CardContent className="pt-0 pb-4 text-sm text-muted-foreground animate-in slide-in-from-top-2">
                    <p className="border-t border-border/50 pt-3">{faq.answer}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Support Form */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-orange-500" />
            Contact Support
          </h2>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Open a Support Ticket</CardTitle>
              <CardDescription>Tell us what you need help with and we'll get back to you within 24 hours.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={supportForm.category}
                      onValueChange={(v: any) => setSupportForm({ ...supportForm, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">Account Access</SelectItem>
                        <SelectItem value="matching">Lawyer Matching</SelectItem>
                        <SelectItem value="evidence">Evidence Collection</SelectItem>
                        <SelectItem value="billing">Billing & Subscription</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Brief summary of the issue"
                      value={supportForm.subject}
                      onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">How can we help?</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe your issue in detail..."
                    rows={6}
                    value={supportForm.message}
                    onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-orange-500 hover:bg-orange-600 min-w-[140px]"
                  >
                    {isSubmitting ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}

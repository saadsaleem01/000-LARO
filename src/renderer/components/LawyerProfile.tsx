import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Briefcase,
  Award,
  Star,
  ArrowLeft,
  ExternalLink
} from "lucide-react";
import { useLocation } from "wouter";

export default function LawyerProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  
  const { data: lawyer, isLoading } = trpc.lawyers.byId.useQuery({
    id: parseInt(id || "0")
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Lawyer not found</p>
            <Button className="mt-4" onClick={() => setLocation("/lawyers")}>
              Back to Lawyers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/lawyers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lawyers
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Profile Card */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{lawyer.name}</CardTitle>
                  {lawyer.firmName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{lawyer.firmName}</span>
                    </div>
                  )}
                  {lawyer.city && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{lawyer.city}</span>
                    </div>
                  )}
                </div>
                {lawyer.novaId && (
                  <Badge variant="secondary">
                    NOvA #{lawyer.novaId}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Information */}
              {(lawyer.email || lawyer.phone || lawyer.website) && (
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Information
                  </h3>
                  <div className="space-y-2 pl-6">
                    {lawyer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <a href={`mailto:${lawyer.email}`} className="text-primary hover:underline">
                          {lawyer.email}
                        </a>
                      </div>
                    )}
                    {lawyer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <a href={`tel:${lawyer.phone}`} className="text-primary hover:underline">
                          {lawyer.phone}
                        </a>
                      </div>
                    )}
                    {lawyer.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <a 
                          href={lawyer.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {lawyer.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Legal Areas */}
              {lawyer.legalAreas && lawyer.legalAreas.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Practice Areas
                  </h3>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {lawyer.legalAreas.map((area, index) => (
                      <Badge key={index} variant="secondary">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Profile URL */}
              {lawyer.profileUrl && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      View full profile on NOvA
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(lawyer.profileUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      NOvA Profile
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Based on platform activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Cases Handled</p>
                  <p className="text-2xl font-bold">{lawyer.casesHandled || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                  <p className="text-2xl font-bold">{lawyer.responseRate || 0}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Acceptance Rate</p>
                  <p className="text-2xl font-bold">{lawyer.acceptanceRate || 0}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">{lawyer.avgResponseTime || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" size="lg">
                <Mail className="h-4 w-4 mr-2" />
                Contact Lawyer
              </Button>
              <Button variant="outline" className="w-full">
                <Star className="h-4 w-4 mr-2" />
                Add to Favorites
              </Button>
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">NOvA Verified</p>
                  <p className="text-xs text-muted-foreground">
                    Registered with Nederlandse Orde van Advocaten
                  </p>
                </div>
              </div>
              {lawyer.barNumber && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Bar Number</p>
                  <p className="font-mono text-sm">{lawyer.barNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          {lawyer.city && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{lawyer.city}</p>
                      {lawyer.address && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {lawyer.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


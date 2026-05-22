import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageLoader from "@/components/PageLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Users, Zap, CreditCard, Gift, ShieldCheck, RefreshCw, Trash2 } from "lucide-react";

const Admin = () => {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Overview stats
  const [stats, setStats] = useState({ users: 0, enhancements: 0, proUsers: 0, creditsUsed: 0 });
  // Users tab
  const [users, setUsers] = useState<any[]>([]);
  // Redeem codes
  const [codes, setCodes] = useState<any[]>([]);
  const [newCodeCredits, setNewCodeCredits] = useState(25);
  const [newCodePlan, setNewCodePlan] = useState("");
  // Enhancement logs
  const [logs, setLogs] = useState<any[]>([]);
  // Edit credits
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState(0);
  const [editPlan, setEditPlan] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [adminConfirm, setAdminConfirm] = useState<{ userId: string; makeAdmin: boolean } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/");
  }, [isAdmin, loading, navigate]);

  // Map user_id → display_name (email-like identifier)
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [adminSet, setAdminSet] = useState<Set<string>>(new Set());
  // Fetch all data
  useEffect(() => {
    if (!isAdmin) return;
    const fetchAll = async () => {
      const [creditsRes, enhRes, codesRes, profilesRes, rolesRes] = await Promise.all([
        supabase.from("user_credits").select("*"),
        supabase.from("enhancement_history").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("redeem_codes").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, display_name, email"),
        supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
      ]);

      const allCredits = creditsRes.data ?? [];
      const allEnhancements = enhRes.data ?? [];
      const allCodes = codesRes.data ?? [];
      const allProfiles = profilesRes.data ?? [];
      const allRoles = rolesRes.data ?? [];

      const pMap: Record<string, string> = {};
      allProfiles.forEach((p) => { pMap[p.id] = p.email || p.display_name || p.id.slice(0, 8); });
      setProfileMap(pMap);
      setAdminSet(new Set(allRoles.map((r) => r.user_id)));
      setStats({
        users: allCredits.length,
        enhancements: allEnhancements.length,
        proUsers: allCredits.filter((c) => c.plan === "pro").length,
        creditsUsed: allCredits.reduce((s, c) => s + c.credits_used, 0),
      });
      setUsers(allCredits);
      setLogs(allEnhancements);
      setCodes(allCodes);
    };
    fetchAll();
  }, [isAdmin, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const toggleAdmin = async (userId: string, makeAdmin: boolean) => {
    if (makeAdmin) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as const });
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
        return;
      }
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
        return;
      }
    }
    toast({ title: makeAdmin ? "Admin granted" : "Admin revoked" });
    refresh();
  };

  const generateCode = async () => {
    const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `TERRA-${rand()}-${rand()}`;
    const { error } = await supabase.from("redeem_codes").insert({
      code,
      credits: newCodeCredits,
      plan_upgrade: newCodePlan || null,
    });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Code created", description: code });
      refresh();
    }
  };

  const saveCredits = async (userId: string) => {
    const { error } = await supabase
      .from("user_credits")
      .update({ credits_remaining: editCredits, plan: editPlan })
      .eq("user_id", userId);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Updated" });
      setEditingUser(null);
      refresh();
    }
  };

  const deleteUser = async (userId: string) => {
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (res.error) {
        toast({ variant: "destructive", title: "Error", description: res.error.message });
      } else if (res.data?.error) {
        toast({ variant: "destructive", title: "Error", description: res.data.error });
      } else {
        toast({ title: "User deleted", description: "The account has been permanently removed." });
        refresh();
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  if (loading) return <PageLoader />;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 space-y-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold gradient-text">Admin Panel</h1>
          <Button variant="ghost" size="icon" onClick={refresh} className="ml-auto">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="codes">Redeem Codes</TabsTrigger>
            <TabsTrigger value="logs">Enhancement Logs</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: stats.users, icon: Users },
                { label: "Enhancements", value: stats.enhancements, icon: Zap },
                { label: "Pro Subscribers", value: stats.proUsers, icon: CreditCard },
                { label: "Credits Consumed", value: stats.creditsUsed, icon: Gift },
              ].map((s) => (
                <Card key={s.label} className="bg-card border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription>{s.label}</CardDescription>
                    <s.icon className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 px-3">User</th>
                        <th className="text-left py-2 px-3">Plan</th>
                        <th className="text-right py-2 px-3">Remaining</th>
                        <th className="text-right py-2 px-3">Used</th>
                        <th className="text-center py-2 px-3">Admin</th>
                        <th className="text-right py-2 px-3">Actions</th>
                        <th className="text-center py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.user_id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="py-2 px-3 text-xs">{profileMap[u.user_id] || u.user_id.slice(0, 8) + "…"}</td>
                          <td className="py-2 px-3">
                            {editingUser === u.user_id ? (
                              <select
                                value={editPlan}
                                onChange={(e) => setEditPlan(e.target.value)}
                                className="bg-muted border border-border rounded px-2 py-1 text-xs"
                              >
                                <option value="free">free</option>
                                <option value="pro">pro</option>
                              </select>
                            ) : (
                              <Badge variant={u.plan === "pro" ? "default" : "secondary"} className="text-xs">
                                {u.plan}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {editingUser === u.user_id ? (
                              <Input
                                type="number"
                                value={editCredits}
                                onChange={(e) => setEditCredits(Number(e.target.value))}
                                className="w-20 h-7 text-xs ml-auto"
                              />
                            ) : (
                              u.credits_remaining
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">{u.credits_used}</td>
                          <td className="py-2 px-3 text-center">
                            <Switch
                              checked={adminSet.has(u.user_id)}
                              onCheckedChange={(checked) => setAdminConfirm({ userId: u.user_id, makeAdmin: checked })}
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            {editingUser === u.user_id ? (
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => saveCredits(u.user_id)}>
                                  Save
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingUser(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setEditingUser(u.user_id);
                                  setEditCredits(u.credits_remaining);
                                  setEditPlan(u.plan);
                                }}
                              >
                                Edit
                              </Button>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteConfirm(u.user_id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && <p className="text-center text-muted-foreground py-8">No users found</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Redeem Codes */}
          <TabsContent value="codes">
            <div className="space-y-4">
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Generate Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Credits</label>
                      <Input
                        type="number"
                        value={newCodeCredits}
                        onChange={(e) => setNewCodeCredits(Number(e.target.value))}
                        className="w-24 h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Plan upgrade (optional)</label>
                      <select
                        value={newCodePlan}
                        onChange={(e) => setNewCodePlan(e.target.value)}
                        className="flex h-9 w-32 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">None</option>
                        <option value="pro">Pro</option>
                      </select>
                    </div>
                    <Button onClick={generateCode} className="h-9">
                      <Gift className="w-4 h-4 mr-1" /> Generate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">All Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-2 px-3">Code</th>
                          <th className="text-right py-2 px-3">Credits</th>
                          <th className="text-left py-2 px-3">Plan</th>
                          <th className="text-left py-2 px-3">Status</th>
                          <th className="text-left py-2 px-3">Redeemed By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codes.map((c) => (
                          <tr key={c.id} className="border-b border-border/30">
                            <td className="py-2 px-3 font-mono text-xs">{c.code}</td>
                            <td className="py-2 px-3 text-right">{c.credits}</td>
                            <td className="py-2 px-3">{c.plan_upgrade || "—"}</td>
                            <td className="py-2 px-3">
                              <Badge variant={c.is_active ? "default" : "secondary"} className="text-xs">
                                {c.is_active ? "Active" : "Redeemed"}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-xs">{c.redeemed_by ? (profileMap[c.redeemed_by] || c.redeemed_by.slice(0, 8) + "…") : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {codes.length === 0 && <p className="text-center text-muted-foreground py-8">No codes yet</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhancement Logs */}
          <TabsContent value="logs">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Recent Enhancements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 px-3">User</th>
                        <th className="text-left py-2 px-3">File</th>
                        <th className="text-left py-2 px-3">Model</th>
                        <th className="text-left py-2 px-3">Scale</th>
                        <th className="text-right py-2 px-3">Time (s)</th>
                        <th className="text-left py-2 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => (
                        <tr key={l.id} className="border-b border-border/30">
                          <td className="py-2 px-3 text-xs">{profileMap[l.user_id] || l.user_id.slice(0, 8) + "…"}</td>
                          <td className="py-2 px-3 max-w-[140px] truncate">{l.file_name}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="text-xs">{l.model}</Badge>
                          </td>
                          <td className="py-2 px-3">{l.scale_factor}</td>
                          <td className="py-2 px-3 text-right">{l.processing_time?.toFixed(1) ?? "—"}</td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">
                            {new Date(l.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {logs.length === 0 && <p className="text-center text-muted-foreground py-8">No enhancements yet</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!adminConfirm} onOpenChange={(open) => !open && setAdminConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {adminConfirm?.makeAdmin ? "Grant admin access?" : "Revoke admin access?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {adminConfirm?.makeAdmin
                ? `This will give ${profileMap[adminConfirm.userId] || "this user"} full admin privileges.`
                : `This will remove admin privileges from ${profileMap[adminConfirm?.userId ?? ""] || "this user"}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (adminConfirm) { toggleAdmin(adminConfirm.userId, adminConfirm.makeAdmin); setAdminConfirm(null); } }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{profileMap[deleteConfirm ?? ""] || "this user"}</strong>'s account, including all their data, credits, and enhancement history. They will need to sign up again to use TerraLens. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteConfirm) deleteUser(deleteConfirm); }}
            >
              {deleting ? "Deleting…" : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Footer />
    </div>
  );
};

export default Admin;

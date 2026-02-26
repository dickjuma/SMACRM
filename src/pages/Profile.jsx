import { useEffect, useMemo, useRef, useState } from "react";
import { authApi } from "../services/authApi";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { getInitials, resolveAvatarUrl } from "../utils/avatar";
import { getSidebarNavigationForRole } from "../components/navigationConfig";

const toHourLabel = (seconds) => `${(Number(seconds || 0) / 3600).toFixed(1)}h`;

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    department: user?.department || "",
    position: user?.position || "",
    location: user?.location || "",
    avatar: user?.avatar || "",
    status: user?.onlineStatus || "offline",
    role: user?.role || "user"
  });
  const [stats, setStats] = useState({
    totalLabel: "0h",
    todayLabel: "0h",
    currentSessionLabel: "0h",
    totalLogins: 0
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const quickMenuItems = useMemo(() => {
    const role = String(user?.role || "user").toLowerCase();
    return getSidebarNavigationForRole(role)
      .flatMap((group) => group.items)
      .slice(0, 8);
  }, [user?.role]);

  const loadProfile = async (options = {}) => {
    const force = Boolean(options?.force);
    try {
      if (force || (!profile.name && !profile.email)) setLoading(true);
      const response = await authApi.getProfile({ force });
      const data = response || {};
      const tracked = data?.stats?.trackedTime || data?.trackedTime || {};
      const totalSeconds = Number(tracked?.totalSeconds ?? data?.stats?.totalSeconds ?? 0);
      const todaySeconds = Number(tracked?.todaySeconds ?? data?.stats?.todaySeconds ?? 0);
      const currentSessionSeconds = Number(
        tracked?.currentSessionSeconds ?? data?.stats?.currentSessionSeconds ?? 0
      );

      const nextProfile = {
        name: data?.name || "",
        email: data?.email || "",
        phone: data?.phone || "",
        address: data?.address || "",
        department: data?.department || "",
        position: data?.position || "",
        location: data?.location || "",
        avatar: data?.avatar || "",
        status: data?.onlineStatus || data?.status || user?.onlineStatus || "offline",
        role: data?.role || "user"
      };

      setProfile(nextProfile);
      setStats({
        totalLabel: tracked?.totalLabel || data?.stats?.totalLabel || toHourLabel(totalSeconds),
        todayLabel: tracked?.todayLabel || data?.stats?.todayLabel || toHourLabel(todaySeconds),
        currentSessionLabel:
          tracked?.currentSessionLabel || data?.stats?.currentSessionLabel || toHourLabel(currentSessionSeconds),
        totalLogins: data?.stats?.totalLogins || 0
      });

      if (user?._id === data?._id && updateUser) {
        updateUser({
          ...user,
          name: data?.name || user?.name,
          phone: data?.phone || user?.phone,
          department: data?.department || user?.department,
          position: data?.position || user?.position,
          location: data?.location || user?.location,
          role: data?.role || user?.role,
          onlineStatus: data?.onlineStatus || user?.onlineStatus,
          avatar: data?.avatar || user?.avatar
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfile((prev) => ({
      ...prev,
      name: prev.name || user?.name || "",
      email: prev.email || user?.email || "",
      phone: prev.phone || user?.phone || "",
      department: prev.department || user?.department || "",
      position: prev.position || user?.position || "",
      location: prev.location || user?.location || "",
      avatar: prev.avatar || user?.avatar || "",
      role: prev.role || user?.role || "user",
      status: prev.status || user?.onlineStatus || "offline"
    }));
  }, [user]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        department: profile.department,
        position: profile.position,
        location: profile.location
      };
      const response = await authApi.updateProfile(payload);
      const updated = response || {};
      if (updateUser && user) {
        updateUser({
          ...user,
          name: updated?.name || profile.name,
          phone: updated?.phone || profile.phone,
          department: updated?.department || profile.department,
          position: updated?.position || profile.position,
          location: updated?.location || profile.location,
          avatar: updated?.avatar || profile.avatar
        });
      }
      toast.success("Profile updated");
      loadProfile({ force: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!String(file.type || "").toLowerCase().startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (Number(file.size || 0) > 5 * 1024 * 1024) {
      toast.error("Image is too large. Max size is 5MB.");
      return;
    }

    try {
      setUploadingAvatar(true);
      const response = await authApi.uploadProfileAvatar(file);
      const updated = response || {};
      setProfile((prev) => ({ ...prev, avatar: updated?.avatar || prev.avatar }));
      if (updateUser && user) {
        updateUser({
          ...user,
          avatar: updated?.avatar || user?.avatar
        });
      }
      toast.success("Profile photo updated");
      loadProfile({ force: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload profile photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("Fill current and new password");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }
    try {
      setPasswordSaving(true);
      await authApi.changePassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading && !profile.name && !profile.email) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading profile...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Sticky quick menu – improved touch targets for mobile */}
      <div className="sticky top-16 z-20 -mx-1 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 px-2 py-2 shadow-sm backdrop-blur sm:hidden">
        <div className="flex w-max items-center gap-2">
          {quickMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.link === "/profile";
            return (
              <button
                key={item.link}
                onClick={() => navigate(item.link)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile header – added scroll margin to avoid being hidden under sticky menu */}
      <div className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">My Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your account details and track your own time.</p>

        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {resolveAvatarUrl(profile.avatar) ? (
            <img
              src={resolveAvatarUrl(profile.avatar)}
              alt={profile.name || "Profile photo"}
              className="h-20 w-20 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-xl font-bold text-white">
              {getInitials(profile.name)}
            </div>
          )}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
            >
              {uploadingAvatar ? "Uploading..." : "Upload Passport Photo"}
            </button>
            <p className="mt-2 text-xs text-slate-500">JPG/PNG/WebP, max 5MB.</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
            <p className="mt-1 font-semibold capitalize text-slate-900">{profile.status}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Today</p>
            <p className="mt-1 font-semibold text-slate-900">{stats.todayLabel}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Current Session</p>
            <p className="mt-1 font-semibold text-slate-900">{stats.currentSessionLabel}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Hours</p>
            <p className="mt-1 font-semibold text-slate-900">{stats.totalLabel}</p>
          </div>
        </div>
      </div>

      {/* Edit details form – inputs use text-base to prevent zoom on mobile */}
      <form onSubmit={handleSaveProfile} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="text-base font-bold text-slate-900">Edit Details</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Name</span>
            <input
              value={profile.name}
              onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Email</span>
            <input
              value={profile.email}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-base text-slate-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Phone</span>
            <input
              value={profile.phone}
              onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Role</span>
            <input
              value={profile.role}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-base text-slate-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Department</span>
            <input
              value={profile.department}
              onChange={(event) => setProfile((prev) => ({ ...prev, department: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Position</span>
            <input
              value={profile.position}
              onChange={(event) => setProfile((prev) => ({ ...prev, position: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Location</span>
            <input
              value={profile.location}
              onChange={(event) => setProfile((prev) => ({ ...prev, location: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-slate-600">Address</span>
            <textarea
              value={profile.address}
              onChange={(event) => setProfile((prev) => ({ ...prev, address: event.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
            />
          </label>
        </div>
        <button
          disabled={saving}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      {/* Change password form – inputs also use text-base */}
      <form onSubmit={handleChangePassword} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="text-base font-bold text-slate-900">Change Password</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Current Password</span>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">New Password</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Confirm New Password</span>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
            />
          </label>
        </div>
        <button
          disabled={passwordSaving}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {passwordSaving ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
};

export default Profile;
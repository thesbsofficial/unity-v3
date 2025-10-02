# Photo Retention Policy - SBS Sell Platform

## Retention Periods

### Temporary Uploads
- **Duration**: 24 hours
- **Trigger**: User uploads photos but doesn't complete submission
- **Action**: Automatic deletion from `temp/` folder
- **Purpose**: Prevent abandoned uploads from consuming storage

### Active Case Photos
- **Duration**: While case is active (pending, reviewing, offered)
- **Storage**: `cases/{CASE-ID}/`
- **Action**: Photos retained for business operations
- **Purpose**: Enable case review, offers, and transaction completion

### Closed Case Photos
- **Duration**: 60 days after case closure
- **Trigger**: Case status changes to `collected` or `rejected`
- **Action**: Automatic deletion 60 days after `updated_at` timestamp
- **Purpose**: Allow time for disputes, returns, and customer service issues

## Why 60 Days?

✅ **Extended Dispute Window**: Covers most consumer protection periods  
✅ **Customer Service**: Allows time to resolve any issues or questions  
✅ **Seasonal Returns**: Accommodates gift returns and delayed feedback  
✅ **GDPR Compliance**: Data minimization - only keep what's needed  
✅ **Cost Effective**: Balance between service quality and storage costs  

## Data Retention Summary

| Data Type | Location | Retention Period |
|-----------|----------|------------------|
| Case metadata (category, brand, price) | D1 Database | **Permanent** (business analytics) |
| Contact details (phone, social) | D1 Database | **Permanent** (follow-ups, repeat sellers) |
| Collection address | D1 Database | **Permanent** (logistics tracking) |
| Case notes & history | D1 Database | **Permanent** (audit trail) |
| **User photos** | **R2 Storage** | **60 days after case closed** |
| Temp uploads (incomplete) | R2 Storage | **24 hours** |

## Example Timeline

```
Day 0:   User submits case
         → Photos: cases/CASE-2025-001/
         → Status: pending
         → Retention: Active (no expiry)

Day 1:   Admin reviews photos
         → Status: reviewing

Day 2:   Offer made
         → Status: offered

Day 3:   Seller accepts, item collected
         → Status: collected
         → Retention countdown starts: 60 days

Day 63:  (60 days after status changed to 'collected')
         → Photos AUTO-DELETED from R2
         → Database record preserved (no photos)
         → Contact info still available for future transactions
```

## Cleanup Automation

Photos are automatically deleted by a Cloudflare Worker that runs daily at 2:00 AM UTC:

```javascript
// Runs daily via cron trigger
async scheduled(event, env, ctx) {
    // Step 1: Delete temp uploads older than 24 hours
    // Step 2: Delete photos for cases closed 60+ days ago
    // Step 3: Remove database photo references
}
```

## Manual Override (if needed)

Admins can manually delete photos earlier via API:

```bash
# Delete photos for specific case immediately
curl -X DELETE https://unity-v3.pages.dev/api/admin/cases/CASE-2025-001/photos \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Adjusting Retention Period

To change the 60-day period, update these locations:

1. **Documentation**: `STORAGE-ARCHITECTURE.md` (line 26, 342)
2. **Cleanup Worker**: `src/cleanup-worker.js` (update query: `'-60 days'`)
3. **This File**: Update all references

**Recommended Options:**
- **30 days**: Standard e-commerce (minimum)
- **60 days**: Extended protection (current setting)
- **90 days**: Maximum consumer protection
- **180 days**: Extra conservative (higher storage costs)

## Cost Impact

**Current**: 60-day retention for 1000 cases/month
- Average active photos at any time: ~60GB
- Storage cost: $0.90/month
- Operations cost: $0.02/month
- **Total**: ~$0.92/month

**If changed to 30 days**: ~30GB = $0.45/month
**If changed to 90 days**: ~90GB = $1.35/month

## GDPR Compliance

✅ **Data Minimization**: Photos deleted when no longer needed for business purpose  
✅ **Purpose Limitation**: Photos used only for transaction processing  
✅ **Storage Limitation**: Clear retention schedule documented  
✅ **User Rights**: Users can request deletion before 60 days via support  

## User Communication

Users are informed of photo retention in:
1. Quick Builder consent checkbox
2. Confirmation email after submission
3. Privacy policy (to be added)

**Suggested Privacy Policy Text:**
> "Photos you submit will be stored securely for up to 60 days after your case is closed. This allows us to resolve any questions or issues. Photos are then automatically deleted from our systems. Case details (category, brand, price) are retained for business analytics but contain no personally identifiable information."

---

**Last Updated**: October 2, 2025  
**Current Setting**: 60 days after case closure  
**Next Review**: Quarterly (or after 500 cases processed)

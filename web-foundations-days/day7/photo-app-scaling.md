# SnapShare: Photo App Scaling Plan

## 1. Assumptions

Before designing the architecture, I will estimate the expected traffic and storage requirements using the following assumptions:

- The app has 10 million registered users.
- 10% of registered users are active each day.
- Each daily active user uploads 1 photo per day.
- Each daily active user views 50 feed pages per day.
- Each original photo is approximately 2 MB.
- Each photo also has a thumbnail of approximately 50 KB.
- One day has 86,400 seconds, and one year has 365 days.
- I will use decimal storage units: 1 MB = 1,000 KB, 1 GB = 1,000 MB, and 1 TB = 1,000 GB.
- Peak traffic is estimated to be 5 times the average traffic.
- Storage estimates assume photos are retained for a full year, without deleting old photos. They exclude backups, replication, and additional storage overhead.

### Daily active users (DAU)

Registered users × Daily active percentage

10,000,000 × 10% = **1,000,000 daily active users**

SnapShare therefore has approximately 1 million daily active users.

## 2. Traffic and Storage Calculations

### A. Photo uploads per second

Each active user uploads one photo per day.

Daily uploads:

1,000,000 users × 1 photo = 1,000,000 uploads per day

Average uploads per second:

1,000,000 ÷ 86,400 ≈ **11.6 uploads per second**

Using the simplified estimate of 100,000 seconds per day:

1,000,000 ÷ 100,000 ≈ 10 uploads per second.

I will use the more accurate 86,400-second calculation for the architecture.

Estimated peak uploads:

11.6 × 5 ≈ **58 uploads per second**

### B. Feed views per second

Each active user views 50 feed pages per day.

Daily feed views:

1,000,000 users × 50 pages = 50,000,000 feed views per day

Average feed views per second:

50,000,000 ÷ 86,400 ≈ **579 feed views per second**

Estimated peak feed views:

579 × 5 ≈ **2,894 feed views per second**

These estimates count feed-page requests, not individual photos displayed on each page. Loading photo files may generate additional requests, many of which can be served by the CDN.

### C. Photo storage per year

Each uploaded photo produces two files:

- Original photo: 2 MB
- Thumbnail: 50 KB = 0.05 MB

Total storage per uploaded photo:

2 MB + 0.05 MB = 2.05 MB

Daily photo storage:

1,000,000 uploads × 2.05 MB = 2,050,000 MB

This is approximately **2.05 TB per day**.

Annual photo storage:

2.05 TB × 365 = **748.25 TB per year**

The annual estimate includes original photos and thumbnails. It does not include backups, replicas, temporary files, or storage overhead.

### Summary of Estimates

| Metric | Average | Peak (5×) |
|---|---:|---:|
| Daily active users | 1,000,000 | — |
| Photo uploads per second | 11.6 | 58 |
| Feed views per second | 579 | 2,894 |
| Photo storage per year | 748.25 TB | — |

## 3. Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view approximately 50 million feed pages per day but upload only 1 million photos per day.

Daily feed views ÷ Daily uploads:

50,000,000 ÷ 1,000,000 = 50

This means there are approximately 50 feed-page views for every photo upload.

The design should therefore prioritize fast reads, efficient caching, and the delivery of photos close to users. A CDN can serve frequently accessed images, a cache can reduce repeated database queries, and a database read replica can handle additional read traffic.

Uploads still need to be reliable, but the architecture should be optimized primarily for the much larger volume of feed reads.

## 4. Why Photos Should Not Be Stored Inside the Database

Photos are large binary files, and storing them directly inside a relational database would increase database size, backups, and query overhead. It would also make it harder to deliver images efficiently through a CDN.

Instead, original photos and thumbnails should be stored in **object storage**, such as Amazon S3 or another compatible object-storage service.

The database should store metadata, such as the photo ID, owner, caption, upload time, and object-storage key. This keeps database records relatively small while allowing photo files to be stored and delivered independently.

## 5. Architecture Diagram

The following diagram shows the main components and how requests and photo files move through SnapShare.

```text
                        USERS
                          |
             +------------+------------+
             |                         |
       Feed / API requests         Photo requests
             |                         |
             v                         v
      +----------------+        +---------------+
      | Load Balancer  |        |      CDN      |
      +----------------+        +---------------+
             |                         |
             v                         |
      +----------------+               |
      |  App Servers   |               |
      | (API services) |               |
      +----------------+               |
          |       |                    |
          |       +--------------------+
          |                Photo URLs / object keys
          |
     +----+----------+---------------------+
     |               |                     |
     v               v                     v
+-----------+  +-------------+     +----------------+
|   Cache   |  |  Database   |     | Object Storage |
|           |  |  Primary DB |     | Original photos|
+-----------+  +-------------+     | and thumbnails |
                      |             +----------------+
                      |
                      v
               +--------------+
               | Read Replica |
               +--------------+

PHOTO UPLOAD PROCESS:

 App Servers
      |
      v
+----------------+
| Object Storage |
| Original Photo |
+----------------+
      |
      v
+----------------+
| Upload Queue   |
+----------------+
      |
      v
+----------------+
| Thumbnail      |
| Worker         |
+----------------+
      |
      v
+----------------+
| Object Storage |
| Thumbnail      |
+----------------+
```

The database primary and read replica are shown separately because writes go to the primary, while suitable read queries can be sent to the replica. The cache and CDN serve different purposes: the cache stores frequently accessed application data, while the CDN delivers image files from locations closer to users.

## 6. What Each Component Does

- **Load balancer:** Distributes incoming API requests across available app servers so that one server does not receive all the traffic.
- **App servers:** Handle authentication, photo uploads, captions, follow relationships, feed generation, and other application logic.
- **Cache:** Stores frequently requested data, such as feed results and profile information, to reduce database queries and improve response times.
- **Database primary:** Stores authoritative application data and processes writes, including photo metadata, users, captions, and follow relationships.
- **Database read replica:** Copies data from the primary and handles suitable read queries, reducing read pressure on the primary database.
- **Object storage:** Stores original photos and generated thumbnails independently of the database.
- **Upload queue:** Holds thumbnail-generation jobs so that image processing can happen asynchronously rather than delaying the upload response.
- **Thumbnail worker:** Retrieves queued jobs, creates smaller thumbnail images, and saves them to object storage.
- **CDN:** Caches and delivers original photos and thumbnails from geographically distributed locations, reducing latency and requests reaching the origin storage.

## 7. Step-by-Step Photo Upload Flow

1. **User selects a photo:** The user chooses an image and submits it through the SnapShare application.

2. **Request reaches the load balancer:** The load balancer routes the upload request to an available app server.

3. **App server validates the request:** The server authenticates the user and checks the file type, file size, and other upload rules.

4. **App server prepares the upload:** The server creates a photo record or upload reference and arranges a secure upload destination. Where appropriate, it can issue a time-limited presigned URL so the client uploads directly to object storage.

5. **Original photo is stored:** The photo is uploaded to object storage, where the original file is retained. The application records the storage key and relevant metadata in the database.

6. **Thumbnail job is queued:** After the original upload is confirmed, the application places a thumbnail-generation job on the queue. The job includes the photo ID and the object's storage key.

7. **Upload response is returned:** The application confirms that the photo has been uploaded and indicates whether thumbnail processing is still pending.

8. **Worker processes the job:** A thumbnail worker consumes the queued job, retrieves the original photo, and generates a smaller thumbnail.

9. **Thumbnail is saved:** The worker stores the thumbnail in object storage and updates the photo metadata to indicate that processing is complete.

10. **Photo appears in the feed:** The application can include the photo in the user's feed. The CDN delivers the original or thumbnail when another user requests it. If processing is incomplete, the application can show a placeholder until the thumbnail is ready.

The queue and worker keep thumbnail processing separate from the user's upload request. This makes the upload experience faster and allows additional workers to be added when processing demand increases.

## 8. Trade-Offs

### Trade-off 1: Caching versus data freshness

Caching feed results reduces database load and improves response times. However, cached data can become outdated when a user uploads a new photo, changes their profile, or follows another user.

A reasonable approach is to use short cache expiration times and invalidate or refresh relevant cache entries when important data changes. This balances performance with freshness, although invalidation adds complexity.

### Trade-off 2: Database read replicas versus consistency

Read replicas allow feed-related queries to be distributed across more database capacity. However, replicas may lag behind the primary database, so a newly uploaded photo or updated profile may not appear immediately in every read.

The application can send important read-after-write requests to the primary database while sending less time-sensitive queries to the replica. This improves scalability but adds routing complexity.

### Trade-off 3: Asynchronous thumbnails versus immediate availability

Using a queue and worker allows uploads to finish without waiting for thumbnail generation. However, users may briefly see a placeholder while the thumbnail is being processed, and the system must handle failed jobs and retries.

This trade-off favors a faster upload experience and better processing scalability over having every image size ready immediately.

### Trade-off 4: Object storage and CDN versus operational complexity

Object storage and a CDN can handle large image volumes more efficiently than storing and serving every file directly from app servers. However, they introduce additional configuration, access-control, caching, and cost-management requirements.

This trade-off is worthwhile because SnapShare is expected to store hundreds of terabytes of new photo data each year and serve many more reads than writes.

## 9. Conclusion

SnapShare has approximately 1 million daily active users, 11.6 average photo uploads per second, 579 average feed-page views per second, and an estimated 748.25 TB of new photo storage per year.

Because the system is read-heavy, the architecture prioritizes CDN delivery, caching, and database read replicas. Original photos and thumbnails are stored in object storage, while the database stores metadata and relationships. A queue and background worker generate thumbnails asynchronously, allowing the application to handle uploads efficiently as usage grows.

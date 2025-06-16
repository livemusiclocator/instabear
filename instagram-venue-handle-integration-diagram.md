# Instagram Venue Handle Integration - System Diagram

The following diagrams illustrate the architecture and workflow of the Instagram venue handle integration system.

## System Components

```mermaid
graph TD
    subgraph "Data Sources"
        A[LML API] -->|Gig Data| B[InstagramGallery Component]
        C[venueInstagramHandles.json] -->|Venue Handles| B
    end
    
    subgraph "Processing"
        B -->|Generate Images| D[Carousel Images]
        B -->|Generate Captions with @ Mentions| E[Instagram Captions]
    end
    
    subgraph "GitHub Integration"
        D -->|Upload| F[GitHub Repository]
        F -->|Public URLs| G[Meta Graph API]
    end
    
    subgraph "Instagram Integration"
        E -->|Captions| G
        G -->|Post Carousel| H[Instagram Account]
    end
    
    subgraph "Token Management"
        I[GitHub Secrets] -->|Access Token| G
        J[Automated Token Refresh] -->|Update| I
    end
```

## Venue Handle Mapping Process

```mermaid
flowchart LR
    A[CSV Venue Data] -->|convert-venue-csv-to-json.js| B[JSON Mapping File]
    B -->|Import| C[Caption Generation Function]
    C -->|Check for Handles| D{Handle Available?}
    D -->|Yes| E[Include @ Mention in Caption]
    D -->|No| F[Standard Caption Format]
```

## Token Refresh Workflow

```mermaid
flowchart TD
    A[Start] -->|Scheduled or Manual| B[GitHub Action Workflow]
    B -->|Execute refreshTokenCI.js| C{Token Valid?}
    C -->|Yes| D[Exchange for New Token]
    C -->|No| E[Manual Intervention Required]
    D -->|Update| F[GitHub Secret]
    F -->|Trigger| G[Deployment]
    E -->|Generate New Token via Meta Developer Portal| F
```

## Caption Generation Logic

```mermaid
sequenceDiagram
    participant InstagramGallery
    participant VenueHandles as venueInstagramHandles.json
    participant Caption as generateCaption()
    
    InstagramGallery->>VenueHandles: Import mapping
    InstagramGallery->>Caption: Generate carousel captions
    
    loop For each gig in slide
        Caption->>VenueHandles: Look up venue.id
        VenueHandles-->>Caption: Return Instagram handle (if exists)
        
        alt Handle exists
            Caption-->>InstagramGallery: Format with @ mention: name @ venue (@handle)
        else No handle
            Caption-->>InstagramGallery: Standard format: name @ venue
        end
    end
    
    InstagramGallery->>InstagramGallery: Join gig captions with newlines
```

These diagrams provide a visual overview of the system architecture, data flow, and key processes involved in the Instagram venue handle integration.
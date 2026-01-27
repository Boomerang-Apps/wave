"""
Supabase Story Loader
Loads stories from Supabase database (SOURCE OF TRUTH) with filesystem fallback

WAVE Model Architecture Compliance:
- Supabase is the primary source of truth for stories
- Filesystem JSON files are fallback for offline/development
- Stories follow Schema V4 format
"""

import os
import json
from typing import List, Dict, Any, Optional

# Try to import supabase client
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None  # Type stub for when supabase not installed
    print("[STORY_LOADER] Warning: supabase-py not installed, using filesystem only")


class StoryLoader:
    """
    Loads stories from Supabase or filesystem.

    Priority:
    1. Supabase database (SOURCE OF TRUTH)
    2. Filesystem JSON files (fallback)
    """

    def __init__(self):
        # Try to load from pydantic settings first, then env vars
        try:
            from config import settings
            self.supabase_url = settings.supabase_url or os.getenv("SUPABASE_URL", "")
            self.supabase_key = settings.supabase_key or os.getenv("SUPABASE_KEY", "")
        except ImportError:
            self.supabase_url = os.getenv("SUPABASE_URL", "")
            self.supabase_key = os.getenv("SUPABASE_KEY", "")
        self._client = None  # Optional supabase Client

    @property
    def client(self):
        """Lazy initialization of Supabase client."""
        if self._client is None and SUPABASE_AVAILABLE and self.supabase_url and self.supabase_key:
            try:
                self._client = create_client(self.supabase_url, self.supabase_key)
                print(f"[STORY_LOADER] Supabase client initialized")
            except Exception as e:
                print(f"[STORY_LOADER] Failed to create Supabase client: {e}")
        return self._client

    def is_db_available(self) -> bool:
        """Check if Supabase database is available."""
        return self.client is not None

    def load_stories_from_db(
        self,
        project_id: str,
        wave_number: int,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Load stories from Supabase database.

        Actual Supabase schema:
        - id: UUID (primary key)
        - project_id: UUID
        - story_id: TEXT (e.g., "AUTH-001")
        - wave_number: INTEGER
        - title: TEXT
        - description: TEXT
        - domain: TEXT
        - agent: TEXT
        - status: TEXT
        - acceptance_criteria: JSONB array
        - story_data: JSONB (additional data)
        - created_at, updated_at: TIMESTAMP

        Args:
            project_id: Project UUID or identifier
            wave_number: Wave number (1, 2, etc.)
            status: Optional status filter (pending, in_progress, completed)

        Returns:
            List of story dictionaries normalized to Schema V4 format
        """
        if not self.client:
            print("[STORY_LOADER] Supabase not available, skipping DB load")
            return []

        try:
            query = self.client.table('stories').select("*")

            # Filter by wave first (always required)
            query = query.eq('wave_number', wave_number)

            # Filter by project if provided (UUID format)
            if project_id and project_id != "":
                query = query.eq('project_id', project_id)

            print(f"[STORY_LOADER] Querying Supabase: wave={wave_number}, project={project_id}")

            # Optional status filter
            if status:
                query = query.eq('status', status)

            response = query.execute()
            print(f"[STORY_LOADER] Supabase response: {len(response.data) if response.data else 0} stories")

            if response.data:
                # Normalize to Schema V4 format
                normalized = []
                for story in response.data:
                    normalized_story = {
                        'id': story.get('story_id'),  # Use story_id as the ID
                        'db_id': story.get('id'),  # Keep DB UUID
                        'title': story.get('title', ''),
                        'domain': story.get('domain', 'general'),
                        'wave': story.get('wave_number', 1),
                        'status': story.get('status', 'pending'),
                        'description': story.get('description', ''),
                        'agent': story.get('agent'),
                        'acceptance_criteria': self._normalize_acceptance_criteria(
                            story.get('acceptance_criteria', [])
                        ),
                        'story_data': story.get('story_data', {}),
                        '_source': 'supabase',
                        '_project_id': story.get('project_id')
                    }
                    # Merge any extra data from story_data
                    if story.get('story_data'):
                        for key in ['objective', 'files', 'safety', 'dependencies']:
                            if key in story['story_data']:
                                normalized_story[key] = story['story_data'][key]

                    normalized.append(normalized_story)

                print(f"[STORY_LOADER] Loaded {len(normalized)} stories from Supabase")
                return normalized
            else:
                print(f"[STORY_LOADER] No stories found in DB for wave {wave_number}")
                return []

        except Exception as e:
            print(f"[STORY_LOADER] Error loading from Supabase: {e}")
            return []

    def _normalize_acceptance_criteria(self, criteria: Any) -> List[Dict[str, str]]:
        """Normalize acceptance criteria to Schema V4 format."""
        if not criteria:
            return []

        normalized = []
        if isinstance(criteria, list):
            for i, item in enumerate(criteria):
                if isinstance(item, str):
                    normalized.append({
                        'id': f'AC-{str(i+1).zfill(3)}',
                        'description': item
                    })
                elif isinstance(item, dict):
                    normalized.append(item)
        return normalized

    def load_stories_from_filesystem(
        self,
        repo_path: str,
        wave_number: int
    ) -> List[Dict[str, Any]]:
        """
        Load stories from filesystem (fallback).

        Args:
            repo_path: Path to repository
            wave_number: Wave number

        Returns:
            List of story dictionaries
        """
        stories_dir = os.path.join(repo_path, "stories", f"wave{wave_number}")
        stories = []

        if not os.path.exists(stories_dir):
            print(f"[STORY_LOADER] Stories directory not found: {stories_dir}")
            return stories

        for filename in os.listdir(stories_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(stories_dir, filename)
                try:
                    with open(filepath, 'r') as f:
                        story = json.load(f)
                        story['_source'] = 'filesystem'
                        story['_filepath'] = filepath
                        stories.append(story)
                except Exception as e:
                    print(f"[STORY_LOADER] Error loading {filename}: {e}")

        print(f"[STORY_LOADER] Loaded {len(stories)} stories from filesystem")
        return stories

    def load_stories(
        self,
        project_id: str,
        repo_path: str,
        wave_number: int,
        story_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Load stories with DB priority, filesystem fallback.

        Args:
            project_id: Project identifier
            repo_path: Path to repository
            wave_number: Wave number
            story_ids: Optional list of specific story IDs to load

        Returns:
            List of story dictionaries
        """
        stories = []

        # Try Supabase first (SOURCE OF TRUTH)
        if self.is_db_available():
            stories = self.load_stories_from_db(project_id, wave_number)
            # Stories from DB already have _source = 'supabase' set

        # Fallback to filesystem only if no DB stories
        if not stories:
            print("[STORY_LOADER] Falling back to filesystem")
            stories = self.load_stories_from_filesystem(repo_path, wave_number)

        # Filter by specific story IDs if provided
        if story_ids:
            stories = [s for s in stories if s.get('id') in story_ids or s.get('story_id') in story_ids]
            print(f"[STORY_LOADER] Filtered to {len(stories)} stories by ID")

        return stories

    def save_story_to_db(self, story: Dict[str, Any], project_id: str) -> bool:
        """
        Save a story to Supabase database.

        Args:
            story: Story dictionary in Schema V4 format
            project_id: Project identifier

        Returns:
            True if successful
        """
        if not self.client:
            print("[STORY_LOADER] Cannot save: Supabase not available")
            return False

        try:
            # Prepare story for DB
            db_story = {
                'story_id': story.get('id'),
                'project_id': project_id,
                'wave_number': story.get('wave', 1),
                'title': story.get('title'),
                'domain': story.get('domain'),
                'objective': story.get('objective'),
                'acceptance_criteria': story.get('acceptance_criteria', []),
                'files': story.get('files', {}),
                'safety': story.get('safety', {}),
                'status': story.get('status', 'pending'),
                'dependencies': story.get('dependencies', {})
            }

            # Upsert (insert or update)
            response = self.client.table('stories').upsert(
                db_story,
                on_conflict='story_id'
            ).execute()

            print(f"[STORY_LOADER] Saved story {story.get('id')} to Supabase")
            return True

        except Exception as e:
            print(f"[STORY_LOADER] Error saving story: {e}")
            return False

    def sync_filesystem_to_db(self, repo_path: str, project_id: str, wave_number: int) -> int:
        """
        Sync filesystem stories to Supabase database.

        Args:
            repo_path: Path to repository
            project_id: Project identifier
            wave_number: Wave number

        Returns:
            Number of stories synced
        """
        fs_stories = self.load_stories_from_filesystem(repo_path, wave_number)
        synced = 0

        for story in fs_stories:
            if self.save_story_to_db(story, project_id):
                synced += 1

        print(f"[STORY_LOADER] Synced {synced}/{len(fs_stories)} stories to Supabase")
        return synced


# Global singleton
_loader: Optional[StoryLoader] = None


def get_story_loader() -> StoryLoader:
    """Get or create the global story loader instance."""
    global _loader
    if _loader is None:
        _loader = StoryLoader()
    return _loader


def load_stories(
    project_id: str,
    repo_path: str,
    wave_number: int = 1,
    story_ids: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Quick helper to load stories.

    Args:
        project_id: Project identifier
        repo_path: Path to repository
        wave_number: Wave number (default: 1)
        story_ids: Optional specific story IDs

    Returns:
        List of story dictionaries
    """
    return get_story_loader().load_stories(project_id, repo_path, wave_number, story_ids)


def sync_stories_to_db(repo_path: str, project_id: str, wave_number: int = 1) -> int:
    """Quick helper to sync filesystem stories to DB."""
    return get_story_loader().sync_filesystem_to_db(repo_path, project_id, wave_number)


__all__ = [
    "StoryLoader",
    "get_story_loader",
    "load_stories",
    "sync_stories_to_db"
]

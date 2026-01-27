"""
WAVE Vercel Deployer - Automated deployment after successful merge

Gate0 Validated Sources:
- Vercel CLI Overview: https://vercel.com/docs/cli
- Deployment Automation API: https://docs.vercel.com/docs/rest-api/reference/examples/deployments-automation
- AI Agents Guide: https://vercel.com/kb/guide/ai-agents

Key findings from research:
1. CLI method: `vercel deploy --prod --token=$VERCEL_TOKEN --yes`
2. API method: POST https://api.vercel.com/v13/deployments
3. Best Practice: Run tests before deployment, verify env vars
4. Security: Never log sensitive tokens

Usage:
    from src.vercel_deployer import VercelDeployer

    deployer = VercelDeployer()

    # Check if deployment conditions are met
    if deployer.can_deploy(qa_result):
        result = deployer.deploy(project_path, dry_run=False)
"""

import os
import sys
import json
import logging
import subprocess
from typing import Dict, Any, Optional
from datetime import datetime

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Slack notifications
try:
    from notifications import notify_step
    NOTIFICATIONS_AVAILABLE = True
except ImportError:
    NOTIFICATIONS_AVAILABLE = False
    def notify_step(*args, **kwargs): pass


class VercelDeployer:
    """
    Automated Vercel deployment after successful merge.

    Integrates with WAVE workflow to deploy after:
    - QA passed
    - Safety score >= threshold
    - Merge completed

    Supports both CLI and API deployment methods.

    Attributes:
        SAFETY_THRESHOLD: Minimum safety score for deployment (0.85)
        dry_run: If True, log deployment but don't execute
    """

    # Minimum safety score required for deployment
    SAFETY_THRESHOLD = 0.85

    # Environment variable names (per Vercel docs)
    TOKEN_VAR = "VERCEL_TOKEN"
    PROJECT_VAR = "VERCEL_PROJECT_ID"
    TEAM_VAR = "VERCEL_TEAM_ID"  # Optional

    def __init__(
        self,
        token: Optional[str] = None,
        project_id: Optional[str] = None,
        team_id: Optional[str] = None,
        dry_run: bool = False
    ):
        """
        Initialize VercelDeployer.

        Args:
            token: Vercel API token (default: from VERCEL_TOKEN env)
            project_id: Vercel project ID (default: from VERCEL_PROJECT_ID env)
            team_id: Vercel team ID, optional (default: from VERCEL_TEAM_ID env)
            dry_run: If True, log actions but don't execute
        """
        self.token = token or os.getenv(self.TOKEN_VAR)
        self.project_id = project_id or os.getenv(self.PROJECT_VAR)
        self.team_id = team_id or os.getenv(self.TEAM_VAR)
        self.dry_run = dry_run

        # Setup logging
        self.logger = logging.getLogger("wave.vercel_deployer")
        self.logger.setLevel(logging.INFO)

    def is_configured(self) -> bool:
        """
        Check if Vercel deployment is properly configured.

        Returns:
            True if token is set, False otherwise
        """
        return self.token is not None

    def can_deploy(self, qa_result: Dict[str, Any]) -> bool:
        """
        Check if deployment conditions are met.

        Per Gate0 research: Require QA pass + safety threshold before deploy.

        Args:
            qa_result: QA result containing qa_passed and safety_score

        Returns:
            True if safe to deploy, False otherwise
        """
        # Must be configured
        if not self.is_configured():
            self.logger.warning("Vercel not configured - missing token")
            return False

        # QA must pass
        if not qa_result.get("qa_passed", False):
            self.logger.info("Cannot deploy - QA not passed")
            return False

        # Safety score must meet threshold
        safety_score = qa_result.get("safety_score", 0.0)
        if safety_score < self.SAFETY_THRESHOLD:
            self.logger.info(f"Cannot deploy - safety {safety_score} < {self.SAFETY_THRESHOLD}")
            return False

        return True

    def deploy_cli(self, project_path: str, production: bool = True) -> Dict[str, Any]:
        """
        Deploy using Vercel CLI.

        Per Vercel docs: `vercel deploy --prod --token=$VERCEL_TOKEN --yes`

        Args:
            project_path: Path to project directory
            production: If True, deploy to production

        Returns:
            Dict with success status, url, and any errors
        """
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Would deploy {project_path} to Vercel")
            return {
                "success": True,
                "dry_run": True,
                "url": "https://dry-run.vercel.app",
                "message": "Dry run - no deployment executed"
            }

        # Build command per Vercel CLI docs
        cmd = ["vercel", "deploy", "--yes"]

        if production:
            cmd.append("--prod")

        if self.token:
            cmd.extend(["--token", self.token])

        if self.project_id:
            cmd.extend(["--scope", self.project_id])

        try:
            self.logger.info(f"Deploying {project_path} to Vercel...")

            # Send Slack notification
            if NOTIFICATIONS_AVAILABLE:
                notify_step(
                    agent="vercel",
                    action="deploying to Vercel",
                    task=project_path,
                    run_id="deploy",
                    status="deploying"
                )

            result = subprocess.run(
                cmd,
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            if result.returncode == 0:
                # Extract deployment URL from output
                url = result.stdout.strip().split('\n')[-1]

                self.logger.info(f"Deployment successful: {url}")

                if NOTIFICATIONS_AVAILABLE:
                    notify_step(
                        agent="vercel",
                        action=f"deployed to {url}",
                        task=project_path,
                        run_id="deploy",
                        status="completed"
                    )

                return {
                    "success": True,
                    "url": url,
                    "message": "Deployment completed"
                }
            else:
                self.logger.error(f"Deployment failed: {result.stderr}")

                if NOTIFICATIONS_AVAILABLE:
                    notify_step(
                        agent="vercel",
                        action="deployment failed",
                        task=project_path,
                        run_id="deploy",
                        status="failed"
                    )

                return {
                    "success": False,
                    "error": result.stderr,
                    "message": "Deployment failed"
                }

        except subprocess.TimeoutExpired:
            self.logger.error("Deployment timed out after 5 minutes")
            return {
                "success": False,
                "error": "Timeout after 5 minutes",
                "message": "Deployment timed out"
            }
        except FileNotFoundError:
            self.logger.error("Vercel CLI not found - install with: npm i -g vercel")
            return {
                "success": False,
                "error": "Vercel CLI not installed",
                "message": "Install Vercel CLI: npm i -g vercel"
            }
        except Exception as e:
            self.logger.error(f"Deployment error: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Unexpected deployment error"
            }

    def deploy(self, project_path: str, production: bool = True) -> Dict[str, Any]:
        """
        Deploy project to Vercel.

        Wrapper method that uses CLI deployment.
        Can be extended to support API deployment.

        Args:
            project_path: Path to project directory
            production: If True, deploy to production

        Returns:
            Dict with deployment result
        """
        return self.deploy_cli(project_path, production)


def get_vercel_deployer(dry_run: bool = False) -> Optional[VercelDeployer]:
    """
    Factory function to get configured VercelDeployer.

    Returns:
        VercelDeployer instance if configured, None otherwise
    """
    deployer = VercelDeployer(dry_run=dry_run)

    if deployer.is_configured():
        return deployer

    logging.getLogger("wave.vercel_deployer").warning(
        f"Vercel not configured - set {VercelDeployer.TOKEN_VAR} environment variable"
    )
    return None

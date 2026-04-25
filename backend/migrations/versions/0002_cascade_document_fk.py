"""cascade document FK for chats and quizzes

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-02 00:00:00
"""
from alembic import op

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def _is_sqlite():
    return op.get_bind().dialect.name == "sqlite"


def upgrade():
    if _is_sqlite():
        # SQLite has no named FK constraints — 0001 already correct
        return

    with op.batch_alter_table('chats') as batch_op:
        batch_op.drop_constraint('chats_document_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(
            'chats_document_id_fkey', 'documents',
            ['document_id'], ['id'], ondelete='CASCADE'
        )
    with op.batch_alter_table('quizzes') as batch_op:
        batch_op.drop_constraint('quizzes_document_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(
            'quizzes_document_id_fkey', 'documents',
            ['document_id'], ['id'], ondelete='CASCADE'
        )


def downgrade():
    if _is_sqlite():
        return

    with op.batch_alter_table('chats') as batch_op:
        batch_op.drop_constraint('chats_document_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(
            'chats_document_id_fkey', 'documents',
            ['document_id'], ['id'], ondelete='SET NULL'
        )
    with op.batch_alter_table('quizzes') as batch_op:
        batch_op.drop_constraint('quizzes_document_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(
            'quizzes_document_id_fkey', 'documents',
            ['document_id'], ['id'], ondelete='SET NULL'
        )
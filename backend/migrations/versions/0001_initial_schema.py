"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2025-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id',              sa.Integer(),     primary_key=True),
        sa.Column('email',           sa.String(255),   nullable=False, unique=True),
        sa.Column('username',        sa.String(100),   nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255),   nullable=False),
        sa.Column('full_name',       sa.String(200),   server_default=''),
        sa.Column('is_active',       sa.Boolean(),     server_default='true'),
        sa.Column('created_at',      sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_users_email',    'users', ['email'])
    op.create_index('ix_users_username', 'users', ['username'])

    op.create_table(
        'documents',
        sa.Column('id',         sa.Integer(),  primary_key=True),
        sa.Column('owner_id',   sa.Integer(),  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title',      sa.String(255), nullable=False),
        sa.Column('filename',   sa.String(255), nullable=False),
        sa.Column('file_path',  sa.String(512), nullable=False),
        sa.Column('file_type',  sa.String(10),  nullable=False),
        sa.Column('file_size',  sa.Integer(),   server_default='0'),
        sa.Column('content',    sa.Text()),
        sa.Column('summary',    sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_documents_owner_id', 'documents', ['owner_id'])

    op.create_table(
        'chats',
        sa.Column('id',          sa.Integer(), primary_key=True),
        sa.Column('user_id',     sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_id', sa.Integer(), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('role',        sa.String(20), nullable=False),
        sa.Column('content',     sa.Text(),     nullable=False),
        sa.Column('created_at',  sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_chats_user_id', 'chats', ['user_id'])

    op.create_table(
        'quizzes',
        sa.Column('id',             sa.Integer(), primary_key=True),
        sa.Column('user_id',        sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_id',    sa.Integer(), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('question',       sa.Text(),    nullable=False),
        sa.Column('options',        sa.JSON(),    nullable=False),
        sa.Column('correct_index',  sa.Integer(), nullable=False),
        sa.Column('explanation',    sa.Text()),
        sa.Column('selected_index', sa.Integer()),
        sa.Column('is_correct',     sa.Boolean()),
        sa.Column('created_at',     sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_quizzes_user_id', 'quizzes', ['user_id'])

    op.create_table(
        'progress',
        sa.Column('id',              sa.Integer(), primary_key=True),
        sa.Column('user_id',         sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('total_documents', sa.Integer(), server_default='0'),
        sa.Column('total_chats',     sa.Integer(), server_default='0'),
        sa.Column('total_quizzes',   sa.Integer(), server_default='0'),
        sa.Column('correct_answers', sa.Integer(), server_default='0'),
        sa.Column('accuracy',        sa.Float(),   server_default='0'),
        sa.Column('study_minutes',   sa.Integer(), server_default='0'),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_progress_user_id', 'progress', ['user_id'])


def downgrade() -> None:
    op.drop_table('progress')
    op.drop_table('quizzes')
    op.drop_table('chats')
    op.drop_table('documents')
    op.drop_table('users')

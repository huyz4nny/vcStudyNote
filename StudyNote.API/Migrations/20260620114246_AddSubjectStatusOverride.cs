using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyNote.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSubjectStatusOverride : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StatusOverride",
                table: "Subjects",
                type: "TEXT",
                maxLength: 10,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StatusOverride",
                table: "Subjects");
        }
    }
}
